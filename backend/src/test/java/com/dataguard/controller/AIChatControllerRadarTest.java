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
