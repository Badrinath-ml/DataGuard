package com.dataguard.repository;

import com.dataguard.entity.AIConversationSession;
import com.dataguard.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AIConversationSessionRepository extends JpaRepository<AIConversationSession, Long> {
    @EntityGraph(attributePaths = {"review", "review.project"})
    Optional<AIConversationSession> findBySessionIdAndUser(UUID sessionId, User user);

    @EntityGraph(attributePaths = {"review", "review.project"})
    Optional<AIConversationSession> findFirstByUserOrderByUpdatedAtDesc(User user);

    @EntityGraph(attributePaths = {"review", "review.project"})
    List<AIConversationSession> findByUserOrderByUpdatedAtDesc(User user);
}
