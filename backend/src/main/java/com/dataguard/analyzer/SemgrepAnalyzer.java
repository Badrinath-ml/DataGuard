package com.dataguard.analyzer;

import com.dataguard.entity.Finding;
import com.dataguard.entity.Review;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Optional Semgrep CLI adapter. The deterministic analyzers still run when Semgrep
 * is disabled; when enabled, a missing executable or failed scan is reported rather
 * than silently pretending Semgrep completed.
 */
@Component
public class SemgrepAnalyzer {
    private static final Logger log = LoggerFactory.getLogger(SemgrepAnalyzer.class);

    @Value("${dataguard.semgrep.enabled:false}")
    private boolean enabled = false;

    @Value("${dataguard.semgrep.executable:semgrep}")
    private String executable = "semgrep";

    @Value("${dataguard.semgrep.config:p/security-audit}")
    private String config = "p/security-audit";

    @Value("${dataguard.semgrep.timeout-seconds:90}")
    private long timeoutSeconds = 90;

    private final ObjectMapper objectMapper;

    public SemgrepAnalyzer(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public List<Finding> analyze(File projectDir, Review review) {
        if (!enabled) {
            return List.of();
        }
        if (projectDir == null || !projectDir.isDirectory()) {
            throw new IllegalArgumentException("Semgrep requires an existing extracted project directory.");
        }
        if (timeoutSeconds <= 0) {
            throw new IllegalStateException("SEMGREP_TIMEOUT_SECONDS must be greater than zero.");
        }

        Path output = null;
        Process process = null;
        try {
            output = Files.createTempFile("dataguard-semgrep-", ".json");
            ProcessBuilder builder = new ProcessBuilder(
                    executable, "scan",
                    "--config", config,
                    "--json",
                    "--quiet",
                    "--metrics=off",
                    "--exclude", ".git",
                    "--exclude", "node_modules",
                    "--exclude", "target",
                    "--exclude", "dist",
                    projectDir.getAbsolutePath());
            builder.redirectOutput(output.toFile());
            builder.redirectError(ProcessBuilder.Redirect.DISCARD);
            process = builder.start();

            if (!process.waitFor(timeoutSeconds, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("Semgrep exceeded its " + timeoutSeconds
                        + "-second scan timeout. Reduce the ZIP size or increase SEMGREP_TIMEOUT_SECONDS.");
            }

            int exitCode = process.exitValue();
            String json = Files.readString(output, StandardCharsets.UTF_8);
            if (exitCode > 1) {
                throw new IllegalStateException("Semgrep exited with code " + exitCode
                        + ". Check that the Semgrep CLI and configured rule pack are available.");
            }
            return parseResults(json, projectDir, review);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Semgrep scan was interrupted.", exception);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not run Semgrep. Install the CLI or set SEMGREP_ENABLED=false.", exception);
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            if (output != null) {
                try {
                    Files.deleteIfExists(output);
                } catch (IOException exception) {
                    log.debug("Could not remove temporary Semgrep output file.");
                }
            }
        }
    }

    List<Finding> parseResults(String json, File projectDir, Review review) throws IOException {
        JsonNode root = objectMapper.readTree(json);
        JsonNode results = root == null ? null : root.get("results");
        if (results == null || !results.isArray()) {
            throw new IllegalStateException("Semgrep did not return a valid JSON results array.");
        }

        List<Finding> findings = new ArrayList<>();
        Path rootPath = projectDir.toPath().toAbsolutePath().normalize();
        for (JsonNode result : results) {
            String ruleId = text(result.path("check_id").asText("Semgrep rule"));
            String path = text(result.path("path").asText(""));
            int line = Math.max(1, result.path("start").path("line").asInt(1));
            JsonNode extra = result.path("extra");
            String message = text(extra.path("message").asText("Semgrep detected a potential issue."));
            String severity = normalizeSeverity(extra.path("severity").asText("WARNING"));
            String evidence = text(extra.path("lines").asText(message));
            if (evidence.length() > 1800) evidence = evidence.substring(0, 1800);
            String relativePath = path;
            try {
                Path candidate = Path.of(path).toAbsolutePath().normalize();
                if (candidate.startsWith(rootPath)) {
                    relativePath = rootPath.relativize(candidate).toString().replace(File.separatorChar, '/');
                }
            } catch (RuntimeException ignored) {
                // Keep the sanitized path returned by Semgrep.
            }

            Finding finding = new Finding();
            finding.setReview(review);
            finding.setCategory("SECURITY");
            finding.setSeverity(severity);
            finding.setTitle((ruleId + ": " + message).substring(0, Math.min(255, (ruleId + ": " + message).length())));
            finding.setFilePath(relativePath);
            finding.setLineNumber(line);
            finding.setEvidence("Semgrep rule: " + ruleId + "\n" + evidence);
            finding.setRecommendation("Review Semgrep rule " + ruleId + ": " + message
                    + " Validate the finding and its remediation before applying changes.");
            finding.setStatus("OPEN");
            findings.add(finding);
        }
        return findings;
    }

    private String normalizeSeverity(String value) {
        return switch (value.toUpperCase(Locale.ROOT)) {
            case "ERROR" -> "HIGH";
            case "WARNING" -> "MEDIUM";
            case "INFO" -> "LOW";
            default -> "LOW";
        };
    }

    private String text(String value) {
        return value == null ? "" : value.replaceAll("[\\r\\n\\t]+", " ").trim();
    }
}
