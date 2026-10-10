package com.dataguard.analyzer;

import com.dataguard.entity.Finding;
import com.dataguard.entity.Review;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CodeQualityAnalyzerTest {
    @TempDir Path root;

    @Test
    void returnsRootRelativePathAndOnlyOffersFixesForExactSafePatterns() throws Exception {
        Path nested = Files.createDirectories(root.resolve("src/main"));
        Files.writeString(nested.resolve("Example.java"), """
                class Example {
                    void run() {
                        System.out.println("debug");
                        try { work(); } catch (Exception e) { }
                        try { work(); } catch (Exception e) { log(e); }
                    }
                }
                """);

        List<Finding> findings = new CodeQualityAnalyzer().analyze(root.toFile(), new Review());
        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getFilePath().equals("src/main/Example.java")));
        assertEquals(1, findings.stream().filter(f -> f.getTitle().equals("System.out.println used")).count());
        assertEquals(1, findings.stream().filter(f -> f.getTitle().equals("Empty catch block")).count());
    }
}
