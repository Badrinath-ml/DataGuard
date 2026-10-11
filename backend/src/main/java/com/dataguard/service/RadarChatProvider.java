package com.dataguard.service;

import java.util.List;

public interface RadarChatProvider {
    record Turn(String role, String content) {}

    String complete(List<Turn> turns);

    default String completeJson(List<Turn> turns) {
        return complete(turns);
    }

    /**
     * Used when a provider returns malformed or semantically invalid structured output.
     * Implementations with multiple providers should try the alternate provider first.
     */
    default String completeJsonFallback(List<Turn> turns) {
        return completeJson(turns);
    }

    boolean isConfigured();
}
