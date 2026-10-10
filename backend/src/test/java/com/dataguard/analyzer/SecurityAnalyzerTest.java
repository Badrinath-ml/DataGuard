package com.dataguard.analyzer;

import com.dataguard.entity.Finding;
import com.dataguard.entity.Review;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SecurityAnalyzerTest {
    @TempDir Path root;

    @Test
    void reportsCredentialWithoutPersistingSecretValue() throws Exception {
        Files.writeString(root.resolve("config.properties"), "api_key = \"sk_live_verySecretValue123\"\n");
        List<Finding> findings = new SecurityAnalyzer().analyze(root.toFile(), new Review());

        assertEquals(1, findings.size());
        assertEquals("SECURITY", findings.get(0).getCategory());
        assertEquals("Potential hard-coded credential", findings.get(0).getTitle());
        assertFalse(findings.get(0).getEvidence().contains("sk_live_verySecretValue123"));
    }

    @Test
    void ignoresEnvironmentVariablePlaceholders() throws Exception {
        Files.writeString(root.resolve("config.js"), "const apiKey = process.env.API_KEY;\n");
        assertTrue(new SecurityAnalyzer().analyze(root.toFile(), new Review()).isEmpty());
    }
}
