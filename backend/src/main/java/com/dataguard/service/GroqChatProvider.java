package com.dataguard.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientResponseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.net.http.HttpClient;
import java.time.Duration;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class GroqChatProvider implements RadarChatProvider {
    private static final Logger log = LoggerFactory.getLogger(GroqChatProvider.class);
    private final RestClient groqClient;
    private final RestClient geminiClient;
    private final String groqApiKey;
    private final String groqModel;
    private final String geminiApiKey;
    private final String geminiModel;
    private final ThreadLocal<String> lastSuccessfulProvider = new ThreadLocal<>();

    public GroqChatProvider(
            RestClient.Builder restClientBuilder,
            @Value("${groq.base-url:https://api.groq.com/openai/v1}") String groqBaseUrl,
            @Value("${groq.api-key:}") String groqApiKey,
            @Value("${groq.model:llama-3.3-70b-versatile}") String groqModel,
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String geminiBaseUrl,
            @Value("${gemini.api-key:}") String geminiApiKey,
            @Value("${gemini.model:gemini-2.5-flash}") String geminiModel) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.groqClient = restClientBuilder.clone().requestFactory(requestFactory).baseUrl(groqBaseUrl).build();
        this.geminiClient = restClientBuilder.clone().requestFactory(requestFactory).baseUrl(geminiBaseUrl).build();
        this.groqApiKey = groqApiKey == null ? "" : groqApiKey.trim();
        this.groqModel = groqModel;
        this.geminiApiKey = geminiApiKey == null ? "" : geminiApiKey.trim();
        this.geminiModel = geminiModel;
    }

    @Override
    public boolean isConfigured() {
        return !groqApiKey.isBlank() || !geminiApiKey.isBlank();
    }

    @Override
    public String complete(List<Turn> turns) {
        return completeInternal(turns, false);
    }

    @Override
    public String completeJson(List<Turn> turns) {
        return completeInternal(turns, true);
    }

    @Override
    public String completeJsonFallback(List<Turn> turns) {
        if (turns == null || turns.isEmpty()) {
            throw new IllegalArgumentException("At least one chat message is required.");
        }
        String previous = lastSuccessfulProvider.get();
        lastSuccessfulProvider.remove();
        List<Map<String, String>> messages = toGroqMessages(turns);
        List<String> order = "groq".equals(previous)
                ? List.of("gemini", "groq")
                : "gemini".equals(previous) ? List.of("groq", "gemini") : List.of("groq", "gemini");
        RuntimeException lastFailure = null;
        for (String candidate : order) {
            if ("groq".equals(candidate) && !groqApiKey.isBlank()) {
                try {
                    String response = completeWithGroq(messages, true);
                    lastSuccessfulProvider.set("groq");
                    return response;
                } catch (RuntimeException failure) {
                    logProviderFailure("Groq structured-output fallback", failure);
                    lastFailure = failure;
                }
            } else if ("gemini".equals(candidate) && !geminiApiKey.isBlank()) {
                try {
                    String response = completeWithGemini(turns, true);
                    lastSuccessfulProvider.set("gemini");
                    return response;
                } catch (RuntimeException failure) {
                    logProviderFailure("Gemini structured-output fallback", failure);
                    lastFailure = failure;
                }
            }
        }
        lastSuccessfulProvider.remove();
        if (lastFailure != null) {
            throw new IllegalStateException("No configured AI provider could repair the structured response.", lastFailure);
        }
        throw new IllegalStateException("No AI provider is configured for structured-output repair.");
    }

    private List<Map<String, String>> toGroqMessages(List<Turn> turns) {
        return turns.stream()
                .map(turn -> Map.of("role", turn.role(), "content", turn.content()))
                .toList();
    }

    private String completeInternal(List<Turn> turns, boolean jsonMode) {
        lastSuccessfulProvider.remove();
        if (turns == null || turns.isEmpty()) {
            throw new IllegalArgumentException("At least one chat message is required.");
        }
        List<Map<String, String>> messages = turns.stream()
                .map(turn -> Map.of("role", turn.role(), "content", turn.content()))
                .toList();

        RuntimeException groqFailure = null;
        if (!groqApiKey.isBlank()) {
            try {
                String response = completeWithGroq(messages, jsonMode);
                lastSuccessfulProvider.set("groq");
                return response;
            } catch (RuntimeException ex) {
                groqFailure = ex;
                logProviderFailure("Groq", ex);
            }
        }

        if (!geminiApiKey.isBlank()) {
            try {
                String response = completeWithGemini(turns, jsonMode);
                lastSuccessfulProvider.set("gemini");
                return response;
            } catch (RuntimeException geminiFailure) {
                logProviderFailure("Gemini", geminiFailure);
                if (groqFailure != null) geminiFailure.addSuppressed(groqFailure);
                throw new IllegalStateException("Both AI providers failed. Check Groq/Gemini quota, key, model, and backend logs.", geminiFailure);
            }
        }

        if (groqFailure != null) {
            throw new IllegalStateException("Groq request failed and GEMINI_API_KEY is not configured for fallback.", groqFailure);
        }
        throw new IllegalStateException("No AI provider is configured. Set GROQ_API_KEY and/or GEMINI_API_KEY in the backend environment.");
    }

    private void logProviderFailure(String providerName, RuntimeException failure) {
        Throwable cause = failure;
        while (cause != null) {
            if (cause instanceof RestClientResponseException response) {
                int status = response.getStatusCode().value();
                String category = status == 401 || status == 403 ? "authentication/configuration"
                        : status == 429 ? "rate-limit-or-quota"
                        : status >= 500 ? "provider-server-error" : "request-rejected";
                // Log only HTTP status/category. Response messages and request URLs can contain credentials.
                log.warn("{} API request failed with HTTP {} ({})", providerName, status, category);
                return;
            }
            cause = cause.getCause();
        }
        log.warn("{} API request failed ({})", providerName, failure.getClass().getSimpleName());
    }

    private String completeWithGroq(List<Map<String, String>> messages, boolean jsonMode) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("model", groqModel);
        body.put("messages", messages);
        body.put("temperature", 0.2);
        if (jsonMode) body.put("response_format", Map.of("type", "json_object"));
        JsonNode response = groqClient.post()
                .uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        JsonNode content = response == null ? null : response.path("choices").path(0).path("message").path("content");
        if (content == null || content.isMissingNode() || content.isNull() || content.asText().isBlank()) {
            throw new IllegalStateException("Groq returned an empty chat completion.");
        }
        return content.asText();
    }

    private String completeWithGemini(List<Turn> turns, boolean jsonMode) {
        List<Map<String, Object>> contents = new ArrayList<>();
        String systemInstruction = null;
        for (Turn turn : turns) {
            if ("system".equalsIgnoreCase(turn.role())) {
                systemInstruction = turn.content();
                continue;
            }
            String role = "assistant".equalsIgnoreCase(turn.role()) ? "model" : "user";
            contents.add(Map.of("role", role, "parts", List.of(Map.of("text", turn.content()))));
        }
        if (contents.isEmpty()) {
            throw new IllegalArgumentException("At least one user message is required for Gemini.");
        }
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("contents", contents);
        Map<String, Object> generationConfig = new java.util.HashMap<>();
        generationConfig.put("temperature", 0.2);
        if (jsonMode) generationConfig.put("responseMimeType", "application/json");
        body.put("generationConfig", generationConfig);
        if (systemInstruction != null && !systemInstruction.isBlank()) {
            body.put("systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        }

        JsonNode response = geminiClient.post()
                .uri("/models/{model}:generateContent?key={key}", geminiModel, geminiApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        JsonNode parts = response == null ? null : response.path("candidates").path(0).path("content").path("parts");
        if (parts == null || !parts.isArray()) {
            throw new IllegalStateException("Gemini returned no candidate content.");
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode part : parts) {
            JsonNode value = part.path("text");
            if (!value.isMissingNode() && !value.isNull()) text.append(value.asText());
        }
        if (text.toString().isBlank()) throw new IllegalStateException("Gemini returned an empty completion.");
        return text.toString();
    }
}
