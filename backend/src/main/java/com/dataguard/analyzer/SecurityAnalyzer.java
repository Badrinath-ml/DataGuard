package com.dataguard.analyzer;

import com.dataguard.entity.Finding;
import com.dataguard.entity.Review;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Conservative, deterministic security checks. This is not a replacement for a
 * full SAST engine or dependency vulnerability database; it reports only the
 * concrete patterns implemented below.
 */
@Component
public class SecurityAnalyzer {
    private static final Pattern CREDENTIAL = Pattern.compile(
            "(?i)\\b(api[_-]?key|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|secret)\\b\\s*[:=]\\s*[\"']?([A-Za-z0-9_./+=-]{8,})");
    private static final Pattern COMMAND_EXEC = Pattern.compile(
            "(?:Runtime\\.getRuntime\\(\\)\\.exec|child_process\\.exec|\\bexec\\s*\\()");

    private static final Set<String> IGNORED_DIRS = Set.of(
            ".git", "node_modules", "target", "build", "dist", ".next", "vendor", "__pycache__");

    public List<Finding> analyze(File projectDir, Review review) {
        List<Finding> findings = new ArrayList<>();
        scan(projectDir, projectDir, review, findings);
        return findings;
    }

    private void scan(File root, File current, Review review, List<Finding> findings) {
        File[] entries = current.listFiles();
        if (entries == null) return;
        for (File entry : entries) {
            if (entry.isDirectory()) {
                if (!IGNORED_DIRS.contains(entry.getName())) scan(root, entry, review, findings);
            } else if (isTextSource(entry.getName())) {
                inspect(root, entry, review, findings);
            }
        }
    }

    private boolean isTextSource(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".java") || lower.endsWith(".js") || lower.endsWith(".jsx")
                || lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".py")
                || lower.endsWith(".properties") || lower.endsWith(".yml") || lower.endsWith(".yaml")
                || lower.endsWith(".json") || lower.endsWith(".env") || lower.endsWith(".sh");
    }

    private void inspect(File root, File file, Review review, List<Finding> findings) {
        try {
            List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
            String relative = root.toPath().toAbsolutePath().normalize()
                    .relativize(file.toPath().toAbsolutePath().normalize()).toString().replace(File.separatorChar, '/');
            for (int i = 0; i < lines.size(); i++) {
                String line = lines.get(i);
                Matcher credential = CREDENTIAL.matcher(line);
                if (credential.find() && !isPlaceholder(credential.group(2))) {
                    add(review, findings, "HIGH", "Potential hard-coded credential", relative, i + 1,
                            "Credential-like assignment detected; the value has been redacted.",
                            "Remove the literal credential, rotate it if it was committed, and load it from a server-side environment variable or secret manager.");
                }
                if (COMMAND_EXEC.matcher(line).find()) {
                    add(review, findings, "MEDIUM", "Command execution call", relative, i + 1, line.trim(),
                            "Avoid passing untrusted input to shell or process execution. Prefer a fixed executable with a validated argument list.");
                }
                if (line.contains("dangerouslySetInnerHTML")) {
                    add(review, findings, "MEDIUM", "Raw HTML insertion", relative, i + 1, line.trim(),
                            "Avoid inserting untrusted HTML. Sanitize it with a maintained sanitizer or render text through the framework's normal escaping.");
                }
                if (line.matches(".*(?i)(verify\\s*=\\s*False|rejectUnauthorized\\s*:\\s*false).*")) {
                    add(review, findings, "MEDIUM", "TLS certificate verification disabled", relative, i + 1, line.trim(),
                            "Enable TLS certificate verification; do not disable it in production requests.");
                }
            }
        } catch (IOException ignored) {
            // An unreadable source file is skipped; do not fail the entire project review.
        }
    }

    private boolean isPlaceholder(String value) {
        String v = value.toLowerCase(Locale.ROOT);
        return v.startsWith("${") || v.contains("process.env") || v.contains("getenv")
                || v.contains("your_") || v.contains("replace_me") || v.contains("changeme")
                || v.contains("example") || v.matches("x{4,}") || Set.of("null", "none", "false", "undefined").contains(v);
    }

    private void add(Review review, List<Finding> findings, String severity, String title,
                     String path, int line, String evidence, String recommendation) {
        Finding finding = new Finding();
        finding.setReview(review);
        finding.setCategory("SECURITY");
        finding.setSeverity(severity);
        finding.setTitle(title);
        finding.setFilePath(path);
        finding.setLineNumber(line);
        finding.setEvidence(evidence.length() > 1800 ? evidence.substring(0, 1800) : evidence);
        finding.setRecommendation(recommendation);
        finding.setStatus("OPEN");
        findings.add(finding);
    }
}
