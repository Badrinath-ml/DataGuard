package com.dataguard.service;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RadarResponseNormalizerTest {
    private final RadarResponseNormalizer normalizer = new RadarResponseNormalizer();

    @Test
    void findModeKeepsNamedProductsAndDropsEditorialCards() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("tools", List.of(
                tool("CapCut", "Edit short videos with templates and captions.", "FREEMIUM", true),
                tool("DaVinci Resolve", "Edit video and perform professional colour grading.", "FREE_WITH_LIMITS", true),
                tool("VN Video Editor", "Edit mobile videos with a multitrack timeline.", "FREE_ONLY", true),
                tool("Purpose", "A summary of what to think about before choosing a tool.", "UNKNOWN", null),
                tool("Bulk personalization", "A workflow feature for creating multiple variants.", "UNKNOWN", null),
                tool("Canva", "Create video designs, titles, and social graphics.", "FREEMIUM", true),
                tool("Adobe Premiere Pro", "Edit and finish long-form video projects.", "PAID_SUBSCRIPTION", false),
                tool("Shotcut", "Edit videos with a free open-source desktop editor.", "FREE_ONLY", true)
        ));

        Map<String, Object> normalized = normalizer.normalize(input, "find", "video editing tools");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tools = (List<Map<String, Object>>) normalized.get("tools");

        assertEquals(6, tools.size());
        assertTrue(tools.stream().anyMatch(t -> "CapCut".equals(t.get("name"))));
        assertFalse(tools.stream().anyMatch(t -> "Purpose".equals(t.get("name"))));
        assertFalse(tools.stream().anyMatch(t -> "Bulk personalization".equals(t.get("name"))));
        assertEquals("find", normalized.get("radarMode"));
    }

    @Test
    void rejectsFindResponseWithoutEnoughRealProducts() {
        Map<String, Object> input = Map.of("tools", List.of(
                tool("Length & Style", "Choose an editing style.", "UNKNOWN", null),
                tool("Purpose", "Consider your project goals before starting.", "UNKNOWN", null)
        ));

        assertThrows(IllegalArgumentException.class,
                () -> normalizer.normalize(input, "find", "video generation tools"));
    }

    @Test
    void workflowRequiresCompleteStepsAndNamedToolsAndFillsStepToolLinks() {
        Map<String, Object> input = new LinkedHashMap<>();
        input.put("title", "Launch a teaching channel");
        List<Map<String, Object>> steps = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("title", "Phase " + i);
            step.put("action", "Complete this phase by preparing the deliverable and checking it before moving forward.");
            step.put("deliverable", "A reviewed phase output " + i);
            steps.add(step);
        }
        input.put("steps", steps);
        input.put("recommendedTools", List.of(
                tool("ChatGPT", "Draft lesson outlines and explain difficult concepts.", "FREEMIUM", true),
                tool("Canva", "Create teaching slides, worksheets, and visuals.", "FREEMIUM", true),
                tool("Google Classroom", "Organize assignments and share class materials.", "FREE_ONLY", true)
        ));

        Map<String, Object> normalized = normalizer.normalize(input, "workflow", "AI tools for teachers");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> normalizedSteps = (List<Map<String, Object>>) normalized.get("steps");

        assertEquals(6, normalizedSteps.size());
        assertTrue(normalizedSteps.stream().allMatch(s -> !((List<?>) s.get("tools")).isEmpty()));
        assertEquals(3, ((List<?>) normalized.get("recommendedTools")).size());
        assertEquals("workflow", normalized.get("radarMode"));
    }

    private static Map<String, Object> tool(String name, String purpose, String pricing, Boolean hasFreePlan) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("name", name);
        value.put("purpose", purpose);
        value.put("pricingType", pricing);
        if (hasFreePlan != null) value.put("hasFreePlan", hasFreePlan);
        value.put("url", "https://example.com");
        return value;
    }
}
