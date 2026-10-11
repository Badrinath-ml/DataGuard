package com.dataguard.service;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Validates the provider's JSON as product data before it is stored or rendered.
 * JSON syntax alone is not enough: a valid response can still contain feature headings
 * ("Bulk personalization") instead of actual software products.
 */
@Component
public class RadarResponseNormalizer {
    private static final Set<String> PRICING_TYPES = Set.of(
            "FREE_ONLY", "FREE_WITH_LIMITS", "FREE_TRIAL_THEN_PAID", "FREEMIUM",
            "PAID_SUBSCRIPTION", "PAID_USAGE", "UNKNOWN");

    public Map<String, Object> normalize(Map<String, Object> input, String mode, String prompt) {
        if (input == null) throw new IllegalArgumentException("The AI response was not a JSON object.");
        Map<String, Object> result = new LinkedHashMap<>(input);
        result.put("radarMode", "workflow".equalsIgnoreCase(mode) ? "workflow" : "find");

        if ("workflow".equalsIgnoreCase(mode)) {
            normalizeWorkflow(result);
        } else {
            List<Map<String, Object>> tools = normalizeTools(firstList(result,
                    "tools", "recommendedTools", "results", "recommendations", "items", "aiTools", "products"), 24);
            if (tools.size() < 5) {
                throw new IllegalArgumentException("The AI response contained fewer than five usable named software products.");
            }
            result.put("tools", tools);
        }
        return result;
    }

    private void normalizeWorkflow(Map<String, Object> result) {
        List<?> rawSteps = firstList(result, "steps", "workflow");
        List<Map<String, Object>> steps = new ArrayList<>();
        for (Object raw : rawSteps) {
            if (raw instanceof String text) {
                Map<String, Object> step = new LinkedHashMap<>();
                step.put("action", text);
                raw = step;
            }
            if (!(raw instanceof Map<?, ?> map)) continue;
            String action = text(map.get("action"), map.get("description"), map.get("details"),
                    map.get("instruction"), map.get("purpose"));
            String title = text(map.get("title"), map.get("name"));
            if (action.length() < 18 || (!title.isBlank() && isEditorialName(title))) continue;
            if (title.isBlank() || title.matches("(?i)^step\\s*\\d+$")) title = deriveTitle(action, steps.size());
            Map<String, Object> step = new LinkedHashMap<>();
            step.put("title", title);
            step.put("action", action);
            String deliverable = text(map.get("deliverable"), map.get("outcome"));
            if (!deliverable.isBlank()) step.put("deliverable", deliverable);
            String estimate = text(map.get("timeEstimate"), map.get("duration"));
            if (!estimate.isBlank()) step.put("timeEstimate", estimate);
            step.put("tools", normalizeTools(firstList(map, "tools", "recommendedTools"), 3));
            steps.add(step);
            if (steps.size() == 8) break;
        }
        if (steps.size() < 5) {
            throw new IllegalArgumentException("The AI response did not contain at least five complete, actionable workflow steps.");
        }

        List<Map<String, Object>> recommended = normalizeTools(firstList(result,
                "recommendedTools", "tools", "results", "recommendations"), 15);
        if (recommended.size() < 3) {
            List<Map<String, Object>> fromSteps = new ArrayList<>();
            for (Map<String, Object> step : steps) {
                Object value = step.get("tools");
                if (value instanceof List<?> list) {
                    for (Object item : list) {
                        if (item instanceof Map<?, ?> tool) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> cast = (Map<String, Object>) tool;
                            if (fromSteps.stream().noneMatch(existing ->
                                    existing.get("name").toString().equalsIgnoreCase(cast.get("name").toString()))) {
                                fromSteps.add(cast);
                            }
                        }
                    }
                }
            }
            recommended = fromSteps.stream().limit(15).toList();
        }
        if (recommended.size() < 3) {
            throw new IllegalArgumentException("The AI response did not include at least three usable named tools for the workflow.");
        }
        for (int i = 0; i < steps.size(); i++) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> stepTools = (List<Map<String, Object>>) steps.get(i).get("tools");
            if (stepTools == null || stepTools.isEmpty()) {
                steps.get(i).put("tools", List.of(recommended.get(i % recommended.size())));
            }
        }

        result.put("steps", steps);
        result.put("recommendedTools", recommended);
        result.putIfAbsent("title", "Your step-by-step workflow");
        result.putIfAbsent("summary", "Follow these connected phases from planning through launch and improvement.");
    }

    private List<Map<String, Object>> normalizeTools(List<?> raw, int limit) {
        List<Map<String, Object>> tools = new ArrayList<>();
        Set<String> seen = new java.util.HashSet<>();
        for (Object item : raw) {
            if (tools.size() >= limit) break;
            if (item instanceof String name) {
                Map<String, Object> simple = new LinkedHashMap<>();
                simple.put("name", name);
                simple.put("purpose", "Suggested software for this task.");
                item = simple;
            }
            if (!(item instanceof Map<?, ?> map)) continue;
            String name = text(map.get("name"), map.get("tool"), map.get("product"), map.get("title"));
            if (!isProductName(name) || !seen.add(name.toLowerCase(Locale.ROOT))) continue;
            String purpose = text(map.get("purpose"), map.get("description"), map.get("primaryUse"),
                    map.get("use"), map.get("summary"));
            if (purpose.isBlank() || purpose.length() < 8) continue;

            Map<String, Object> tool = new LinkedHashMap<>();
            tool.put("name", name);
            tool.put("purpose", purpose);
            copyText(tool, "category", map.get("category"));
            copyText(tool, "bestFor", map.get("bestFor"));
            copyText(tool, "howToUse", map.get("howToUse"));
            String pricingType = text(map.get("pricingType"), map.get("accessType"), map.get("pricing"))
                    .toUpperCase(Locale.ROOT).replaceAll("[\\s-]+", "_");
            tool.put("pricingType", PRICING_TYPES.contains(pricingType) ? pricingType : "UNKNOWN");
            Object free = map.get("hasFreePlan");
            tool.put("hasFreePlan", free instanceof Boolean ? free : null);
            Object monthly = map.get("monthlyPriceUsd");
            if (monthly instanceof Number number && number.doubleValue() >= 0 && number.doubleValue() < 100_000) {
                tool.put("monthlyPriceUsd", number.doubleValue());
            } else {
                tool.put("monthlyPriceUsd", null);
            }
            String pricingDetails = text(map.get("pricingDetails"), map.get("price"));
            tool.put("pricingDetails", pricingDetails.isBlank() ? "Verify current plan/pricing on the official website." : pricingDetails);
            String url = text(map.get("url"), map.get("website"), map.get("officialUrl"), map.get("link"));
            tool.put("url", safeHttpsUrl(url));
            tools.add(tool);
        }
        return tools;
    }

    private boolean isProductName(String name) {
        if (name == null || name.length() < 2 || name.length() > 64 || isEditorialName(name)) return false;
        if (name.matches("(?i)^(purpose|features?|pros? and cons?|workflow|step\\s*\\d+|tools?|ai tools?|recommended tools?|recommended ai tools|tool recommendations?|conclusion|summary|research|pricing|comparison|product recommendations?)$")) return false;
        if (name.matches("(?i)^(?:ai )?tools? for .+$")) return false;
        return !name.matches("(?i).*(?:\\bvs\\.?\\b|\\bversus\\b|\\bcompare\\b|\\bcomparison\\b|\\bsubscription\\b|\\blicensing\\b|\\bprivacy\\b|\\brequirements?\\b|\\bexport limits?\\b|\\bmanual control\\b|\\bpersonalization\\b|\\bpricing\\b|\\bfeatures?\\b|\\btool categories\\b).*");
    }

    private boolean isEditorialName(String value) {
        if (value == null || value.isBlank()) return true;
        return value.matches("(?i).*(?:length\\s*(?:&|and)\\s*style|human[- ]like presenters?|narrated(?:/| or )presenter[- ]style videos?|presenter[- ]style videos?|automation\\s*(?:&|and|vs\\.?|versus)\\s*manual control|turn existing text|bulk personalization|full control|commercial licensing|resolution\\s*(?:&|and)\\s*export limits?|data privacy|gpu requirements?|project management software|document editors?|whiteboarding tools?|top tools|best tools|tool categories|recommended ai tools|purpose|step-by-step workflow).*");
    }

    private List<?> firstList(Map<?, ?> map, String... keys) {
        List<?> empty = null;
        for (String key : keys) {
            Object value = map.get(key);
            if (value instanceof List<?> list) {
                if (!list.isEmpty()) return list;
                empty = list;
            }
        }
        return empty == null ? List.of() : empty;
    }

    private String text(Object... values) {
        for (Object value : values) {
            if (value != null && !value.toString().isBlank()) {
                return value.toString().replaceAll("[\\r\\n\\t]+", " ").trim();
            }
        }
        return "";
    }

    private void copyText(Map<String, Object> target, String key, Object value) {
        String cleaned = text(value);
        if (!cleaned.isBlank()) target.put(key, cleaned);
    }

    private String safeHttpsUrl(String value) {
        if (value == null || value.isBlank()) return "";
        try {
            URI uri = URI.create(value.trim());
            if ("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null) return uri.toString();
        } catch (IllegalArgumentException ignored) {
            // An invalid provider URL is omitted rather than rendered as a link.
        }
        return "";
    }

    private String deriveTitle(String action, int index) {
        String[] words = action.split("\\s+");
        StringBuilder title = new StringBuilder();
        for (int i = 0; i < Math.min(6, words.length); i++) {
            if (i > 0) title.append(' ');
            title.append(words[i]);
        }
        return title.length() == 0 ? "Phase " + (index + 1) : title.toString().replaceAll("[,:;.!]+$", "");
    }
}
