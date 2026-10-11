package com.dataguard.service;

import com.dataguard.entity.AIExplanation;
import com.dataguard.entity.Finding;
import com.dataguard.repository.AIExplanationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AIService {
    private static final Logger log = LoggerFactory.getLogger(AIService.class);
    // Explanations are optional. Bound the work so a project upload never waits minutes on the AI provider.
    private static final int MAX_EXPLANATIONS = 5;
    private static final long TIME_BUDGET_MS = 20_000L;

    private final RadarChatProvider provider;
    private final AIExplanationRepository aiExplanationRepository;

    public AIService(RadarChatProvider provider,
                     AIExplanationRepository aiExplanationRepository) {
        this.provider = provider;
        this.aiExplanationRepository = aiExplanationRepository;
    }

    public void generateExplanations(List<Finding> findings) {
        if (!provider.isConfigured() || findings == null || findings.isEmpty()) {
            log.info("Skipping AI explanations because Groq is not configured or there are no findings.");
            return;
        }

        long deadline = System.currentTimeMillis() + TIME_BUDGET_MS;
        int attempted = 0;
        for (Finding finding : findings) {
            if (attempted >= MAX_EXPLANATIONS || System.currentTimeMillis() > deadline) break;
            attempted++;
            try {
                String systemPrompt = """
                        Explain this code-review finding concisely.
                        Return three labeled lines: Explanation, Impact, Recommended action.
                        Do not claim to have executed or tested the code.
                        """;
                String evidence = "Title: " + safe(finding.getTitle())
                        + "\nSeverity: " + safe(finding.getSeverity())
                        + "\nEvidence: " + safe(finding.getEvidence())
                        + "\nExisting recommendation: " + safe(finding.getRecommendation());

                String response = provider.complete(List.of(
                        new RadarChatProvider.Turn("system", systemPrompt),
                        new RadarChatProvider.Turn("user", evidence)
                ));

                AIExplanation explanation = new AIExplanation();
                explanation.setFinding(finding);
                explanation.setExplanation(response);
                explanation.setImpact("See the impact described in the AI explanation.");
                explanation.setRecommendedAction(finding.getRecommendation());
                aiExplanationRepository.save(explanation);
            } catch (Exception exception) {
                // AI is an enhancement; deterministic review results must still be returned.
                log.warn("AI explanation failed for finding {} ({})",
                        finding.getId(), exception.getClass().getSimpleName());
            }
        }
    }

    private String safe(String value) {
        return value == null ? "Not provided" : value;
    }
}
