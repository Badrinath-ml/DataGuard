package com.dataguard.analyzer;

import com.dataguard.entity.Finding;
import com.dataguard.entity.Review;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SemgrepAnalyzerTest {
    private final SemgrepAnalyzer analyzer = new SemgrepAnalyzer(new ObjectMapper());

    @TempDir
    Path projectDir;

    @Test
    void mapsSemgrepJsonIntoPersistableSecurityFindings() throws Exception {
        String json = """
                {
                  "results": [{
                    "check_id": "javascript.lang.security.audit.eval-detected",
                    "path": "src/app.js",
                    "start": {"line": 12},
                    "extra": {
                      "message": "Avoid evaluating untrusted input.",
                      "severity": "ERROR",
                      "lines": "eval(userInput)"
                    }
                  }]
                }
                """;
        Review review = new Review();

        List<Finding> findings = analyzer.parseResults(json, projectDir.toFile(), review);

        assertEquals(1, findings.size());
        Finding finding = findings.get(0);
        assertEquals("SECURITY", finding.getCategory());
        assertEquals("HIGH", finding.getSeverity());
        assertEquals("src/app.js", finding.getFilePath());
        assertEquals(12, finding.getLineNumber());
        assertEquals(review, finding.getReview());
        assertTrue(finding.getTitle().contains("eval-detected"));
        assertEquals("OPEN", finding.getStatus());
    }

    @Test
    void rejectsInvalidSemgrepJsonInsteadOfPretendingTheScanPassed() {
        assertThrows(Exception.class,
                () -> analyzer.parseResults("{\"notResults\":[]}", new File("."), new Review()));
    }

    @Test
    void disabledSemgrepDoesNotRequireTheCliForLocalDevelopment() {
        assertTrue(analyzer.analyze(projectDir.toFile(), new Review()).isEmpty());
    }
}
