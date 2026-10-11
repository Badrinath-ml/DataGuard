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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
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

        mockMvc.perform(get("/api/ai/chat/sessions")
                        .header("Authorization", "Bearer " + loginToken))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        mockMvc.perform(options("/api/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }
}
