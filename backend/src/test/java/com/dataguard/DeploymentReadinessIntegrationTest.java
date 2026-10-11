package com.dataguard;

import com.dataguard.controller.HealthController;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;
import java.util.Map;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "DATAGUARD_INTEGRATION_TESTS", matches = "true")
class DeploymentReadinessIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private Flyway flyway;
    @Autowired private HealthController healthController;

    @Test
    void migrationsHealthAuthenticationJwtProtectedRoutesAndCorsWorkTogether() throws Exception {
        assertNotNull(flyway.info().current(), "Flyway must apply a schema migration before Hibernate starts");
        assertEquals("1", flyway.info().current().getVersion().getVersion());
        Integer tableCount = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name IN ('users', 'projects', 'reviews', 'findings',
                                     'ai_explanations', 'ai_conversation_sessions', 'ai_conversation_messages')
                """, Integer.class);
        assertEquals(7, tableCount);
        assertEquals(200, healthController.health().getStatusCode().value());

        String email = "integration-" + UUID.randomUUID() + "@example.com";
        String password = "Correct-Horse-Battery-42";
        String registration = """
                {"fullName":"Integration Test","email":"%s","password":"%s"}
                """.formatted(email, password);
        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registration))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value(email))
                .andReturn();
        JsonNode registered = objectMapper.readTree(registerResult.getResponse().getContentAsString());
        String registerToken = registered.path("token").asText();
        assertFalse(registerToken.isBlank());

        String login = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(login))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();
        String loginToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("token").asText();
        assertFalse(loginToken.isBlank());

        mockMvc.perform(get("/api/ai/chat/sessions"))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(get("/api/ai/chat/sessions")
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        MvcResult createdSession = mockMvc.perform(post("/api/ai/chat/sessions")
                        .header("Authorization", "Bearer " + loginToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Integration chat\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sessionId").isNotEmpty())
                .andReturn();
        String sessionId = objectMapper.readTree(createdSession.getResponse().getContentAsString())
                .path("sessionId").asText();
        mockMvc.perform(get("/api/ai/chat/history").param("sessionId", sessionId)
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionId").value(sessionId))
                .andExpect(jsonPath("$.messages").isArray());

        String otherToken = registerAndGetToken(
                "Other Account", "other-" + UUID.randomUUID() + "@example.com", "Correct-Horse-Battery-42");
        mockMvc.perform(get("/api/ai/chat/sessions")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
        mockMvc.perform(get("/api/projects/reviews")
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void zipUploadStoresRealReviewAndAllowsOwnerToDownloadIt() throws Exception {
        String email = "upload-" + UUID.randomUUID() + "@example.com";
        String token = registerAndGetToken("Upload Integration", email, "Correct-Horse-Battery-42");
        byte[] archive = createZip("src/App.java",
                "public class App {\n  public void run() {\n    System.out.println(\"hello\");\n  }\n}\n");

        MvcResult uploaded = mockMvc.perform(multipart("/api/projects/upload")
                        .file(new MockMultipartFile("file", "sample.zip", "application/zip", archive))
                        .param("name", "sample-project")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.projectName").value("sample-project"))
                .andExpect(jsonPath("$.qualityScore").isNumber())
                .andExpect(jsonPath("$.findings").isArray())
                .andExpect(jsonPath("$.findings.length()").value(1))
                .andReturn();

        long reviewId = objectMapper.readTree(uploaded.getResponse().getContentAsString()).path("id").asLong();
        mockMvc.perform(get("/api/projects/reviews")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(reviewId));

        MvcResult download = mockMvc.perform(get("/api/projects/reviews/{reviewId}/download", reviewId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(request().asyncStarted())
                .andReturn();
        mockMvc.perform(asyncDispatch(download))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/octet-stream"));
    }

    @Test
    void invalidZipIsRejectedAndDoesNotCreateAProjectRecord() throws Exception {
        String email = "invalid-zip-" + UUID.randomUUID() + "@example.com";
        String token = registerAndGetToken("Invalid ZIP Test", email, "Correct-Horse-Battery-42");
        Integer before = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM projects", Integer.class);
        byte[] archive = createZip("../outside.txt", "should not be extracted");

        mockMvc.perform(multipart("/api/projects/upload")
                        .file(new MockMultipartFile("file", "unsafe.zip", "application/zip", archive))
                        .param("name", "unsafe-project")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());

        Integer after = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM projects", Integer.class);
        assertEquals(before, after, "Failed archive extraction must roll back the project row");
    }

    private String registerAndGetToken(String name, String email, String password) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "fullName", name, "email", email, "password", password));
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("token").asText();
    }

    private byte[] createZip(String entryName, String content) throws Exception {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
             ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry(entryName));
            zip.write(content.getBytes(StandardCharsets.UTF_8));
            zip.closeEntry();
            zip.finish();
            return bytes.toByteArray();
        }
    }

}
