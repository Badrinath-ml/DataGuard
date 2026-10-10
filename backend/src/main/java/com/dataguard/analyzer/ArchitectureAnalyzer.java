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

/**
 * Lightweight structural checks. Findings describe measurable source layout
 * signals, not a claim that the whole architecture has been formally verified.
 */
@Component
public class ArchitectureAnalyzer {
    private static final int LARGE_SOURCE_FILE_LINES = 500;
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
            } else if (isSource(entry.getName())) {
                inspect(root, entry, review, findings);
            }
        }
    }

    private boolean isSource(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".java") || lower.endsWith(".js") || lower.endsWith(".jsx")
                || lower.endsWith(".ts") || lower.endsWith(".tsx") || lower.endsWith(".py")
                || lower.endsWith(".go") || lower.endsWith(".cs") || lower.endsWith(".php");
    }

    private void inspect(File root, File file, Review review, List<Finding> findings) {
        try {
            List<String> lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
            if (lines.size() <= LARGE_SOURCE_FILE_LINES) return;
            String relative = root.toPath().toAbsolutePath().normalize()
                    .relativize(file.toPath().toAbsolutePath().normalize()).toString().replace(File.separatorChar, '/');
            Finding finding = new Finding();
            finding.setReview(review);
            finding.setCategory("ARCHITECTURE");
            finding.setSeverity("LOW");
            finding.setTitle("Large source file");
            finding.setFilePath(relative);
            finding.setLineNumber(1);
            finding.setEvidence("This source file contains " + lines.size() + " lines; the configured review threshold is " + LARGE_SOURCE_FILE_LINES + ".");
            finding.setRecommendation("Consider separating distinct responsibilities into smaller modules or classes. Review cohesion and dependencies before refactoring.");
            finding.setStatus("OPEN");
            findings.add(finding);
        } catch (IOException ignored) {
            // An unreadable source file is skipped; do not fail the entire review.
        }
    }
}
