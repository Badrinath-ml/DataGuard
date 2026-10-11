package com.dataguard.controller;

import com.dataguard.entity.AIConversationMessage;
import com.dataguard.entity.AIConversationSession;
import com.dataguard.entity.User;
import com.dataguard.repository.AIConversationMessageRepository;
import com.dataguard.repository.AIConversationSessionRepository;
import com.dataguard.repository.FindingRepository;
import com.dataguard.repository.ReviewRepository;
import com.dataguard.repository.UserRepository;
import com.dataguard.service.RadarChatProvider;
import com.dataguard.service.RadarResponseNormalizer;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AIChatControllerRadarTest {
    @Test
    void invalidPrimaryJsonUsesAlternateProviderAndReturnsNamedProducts() {
        RadarChatProvider provider = mock(RadarChatProvider.class);
        UserRepository users = mock(UserRepository.class);
        AIConversationSessionRepository sessions = mock(AIConversationSessionRepository.class);
        AIConversationMessageRepository messages = mock(AIConversationMessageRepository.class);
        ReviewRepository reviews = mock(ReviewRepository.class);
        FindingRepository findings = mock(FindingRepository.class);
        Authentication authentication = mock(Authentication.class);
        User user = new User();
        user.setEmail("teacher@example.com");

        when(authentication.getName()).thenReturn("teacher@example.com");
        when(users.findByEmail("teacher@example.com")).thenReturn(Optional.of(user));
        when(provider.isConfigured()).thenReturn(true);
        when(provider.completeJson(any())).thenReturn("{\"tools\":[]}");
        when(provider.completeJsonFallback(any())).thenReturn("""
                {"tools":[
                  {"name":"CapCut","purpose":"Edit short videos with captions and templates.","pricingType":"FREEMIUM","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://www.capcut.com"},
                  {"name":"DaVinci Resolve","purpose":"Edit video and perform professional colour grading.","pricingType":"FREE_WITH_LIMITS","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://www.blackmagicdesign.com/products/davinciresolve"},
                  {"name":"VN Video Editor","purpose":"Edit mobile videos using a multitrack timeline.","pricingType":"FREE_ONLY","hasFreePlan":true,"pricingDetails":"Verify current terms","url":"https://www.vlognow.me"},
                  {"name":"Descript","purpose":"Edit audio and video by editing the transcript.","pricingType":"FREEMIUM","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://www.descript.com"},
                  {"name":"Adobe Premiere Pro","purpose":"Edit and finish professional video projects.","pricingType":"PAID_SUBSCRIPTION","hasFreePlan":false,"pricingDetails":"Check current plans","url":"https://www.adobe.com/products/premiere.html"},
                  {"name":"VEED","purpose":"Edit browser-based videos and add subtitles.","pricingType":"FREEMIUM","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://www.veed.io"},
                  {"name":"Runway","purpose":"Generate and edit videos with AI-assisted tools.","pricingType":"FREEMIUM","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://runwayml.com"},
                  {"name":"Adobe Express","purpose":"Create short social videos and branded content.","pricingType":"FREEMIUM","hasFreePlan":true,"pricingDetails":"Check current plans","url":"https://www.adobe.com/express"}
                ]}
                """);
        when(sessions.save(any(AIConversationSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messages.save(any(AIConversationMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AIChatController controller = new AIChatController(provider, users, sessions, messages, reviews, findings,
                new RadarResponseNormalizer());

        ResponseEntity<?> response = controller.radar(
                new AIChatController.RadarRequest("I need video editing tools", "find", "Video", "Any price", null),
                authentication);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertInstanceOf(Map.class, response.getBody());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body.get("sessionId"));
        assertTrue(body.get("reply").toString().contains("DaVinci Resolve"));
        verify(provider, times(1)).completeJsonFallback(any());
        verify(messages, times(2)).save(any(AIConversationMessage.class));
    }

    @Test
    void providerFailureStillPersistsPromptAndReturnsSessionId() {
        RadarChatProvider provider = mock(RadarChatProvider.class);
        UserRepository users = mock(UserRepository.class);
        AIConversationSessionRepository sessions = mock(AIConversationSessionRepository.class);
        AIConversationMessageRepository messages = mock(AIConversationMessageRepository.class);
        ReviewRepository reviews = mock(ReviewRepository.class);
        FindingRepository findings = mock(FindingRepository.class);
        Authentication authentication = mock(Authentication.class);
        User user = new User();
        user.setEmail("teacher@example.com");

        when(authentication.getName()).thenReturn("teacher@example.com");
        when(users.findByEmail("teacher@example.com")).thenReturn(Optional.of(user));
        when(provider.isConfigured()).thenReturn(true);
        when(provider.completeJson(any())).thenThrow(new IllegalStateException("simulated provider outage"));
        when(sessions.save(any(AIConversationSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messages.save(any(AIConversationMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AIChatController controller = new AIChatController(provider, users, sessions, messages, reviews, findings,
                new RadarResponseNormalizer());

        ResponseEntity<?> response = controller.radar(
                new AIChatController.RadarRequest("I need AI tools for teaching", "find", "Education", "Any price", null),
                authentication);

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertInstanceOf(Map.class, response.getBody());
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertNotNull(body.get("sessionId"));
        assertTrue(body.get("message").toString().contains("prompt was saved"));
        verify(sessions, atLeast(2)).save(any(AIConversationSession.class));
        verify(messages, times(2)).save(any(AIConversationMessage.class));
    }
}
