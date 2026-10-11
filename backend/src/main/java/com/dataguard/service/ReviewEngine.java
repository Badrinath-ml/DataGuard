package com.dataguard.service;

import com.dataguard.analyzer.ArchitectureAnalyzer;
import com.dataguard.analyzer.CodeQualityAnalyzer;
import com.dataguard.analyzer.SecurityAnalyzer;
import com.dataguard.analyzer.SemgrepAnalyzer;
import com.dataguard.entity.Finding;
import com.dataguard.entity.Project;
import com.dataguard.entity.Review;
import com.dataguard.repository.FindingRepository;
import com.dataguard.repository.ReviewRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReviewEngine {
    private final ReviewRepository reviewRepository;
    private final FindingRepository findingRepository;
    private final CodeQualityAnalyzer codeQualityAnalyzer;
    private final SecurityAnalyzer securityAnalyzer;
    private final SemgrepAnalyzer semgrepAnalyzer;
    private final ArchitectureAnalyzer architectureAnalyzer;
    private final AIService aiService;

    public Review runReview(Project project, File extractedProjectDir) {
        Review review = new Review();
        review.setProject(project);
        review.setQualityScore(100);
        review = reviewRepository.save(review);

        // These are deterministic local checks. Their results, not placeholder
        // dashboard numbers, are persisted and returned to the frontend.
        List<Finding> findings = new ArrayList<>();
        findings.addAll(codeQualityAnalyzer.analyze(extractedProjectDir, review));
        findings.addAll(securityAnalyzer.analyze(extractedProjectDir, review));
        findings.addAll(architectureAnalyzer.analyze(extractedProjectDir, review));
        findings.addAll(semgrepAnalyzer.analyze(extractedProjectDir, review));

        if (!findings.isEmpty()) {
            findingRepository.saveAll(findings);
        }

        int score = 100;
        for (Finding finding : findings) {
            if ("CRITICAL".equalsIgnoreCase(finding.getSeverity())) score -= 15;
            else if ("HIGH".equalsIgnoreCase(finding.getSeverity())) score -= 10;
            else if ("MEDIUM".equalsIgnoreCase(finding.getSeverity())) score -= 5;
            else score -= 2;
        }
        review.setQualityScore(Math.max(0, score));
        review = reviewRepository.save(review);

        // AI explanations are optional and must never block the deterministic review.
        if (!findings.isEmpty()) aiService.generateExplanations(findings);
        return review;
    }

    public ReviewEngine(ReviewRepository reviewRepository,
                        FindingRepository findingRepository,
                        CodeQualityAnalyzer codeQualityAnalyzer,
                        SecurityAnalyzer securityAnalyzer,
                        ArchitectureAnalyzer architectureAnalyzer,
                        SemgrepAnalyzer semgrepAnalyzer,
                        AIService aiService) {
        this.reviewRepository = reviewRepository;
        this.findingRepository = findingRepository;
        this.codeQualityAnalyzer = codeQualityAnalyzer;
        this.securityAnalyzer = securityAnalyzer;
        this.architectureAnalyzer = architectureAnalyzer;
        this.semgrepAnalyzer = semgrepAnalyzer;
        this.aiService = aiService;
    }
}
