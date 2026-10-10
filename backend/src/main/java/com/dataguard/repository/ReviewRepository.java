package com.dataguard.repository;

import com.dataguard.entity.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProjectId(Long projectId);

    @EntityGraph(attributePaths = {"project", "project.user"})
    @Override
    Optional<Review> findById(Long id);

    @Query("select r from Review r where r.project.user.id = :userId order by r.reviewDate desc")
    @EntityGraph(attributePaths = {"project", "project.user"})
    List<Review> findAllForUser(@Param("userId") Long userId);
}
