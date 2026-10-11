package com.dataguard.service;

import com.dataguard.entity.Project;
import com.dataguard.entity.Review;
import com.dataguard.entity.User;
import com.dataguard.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;

@Service
public class ProjectService {

    @Value("${dataguard.review.max-uncompressed-bytes:104857600}")
    private long maxUncompressedBytes = 104857600L;

    @Value("${dataguard.storage.directory:${java.io.tmpdir}}")
    private String storageDirectory = System.getProperty("java.io.tmpdir");

    private final ProjectRepository projectRepository;
    private final ReviewEngine reviewEngine;

    @Transactional(rollbackFor = Exception.class)
    public Review processProjectUpload(MultipartFile file, User user, String projectName) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new InvalidArchiveException("The uploaded ZIP file is empty.");
        }
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("A registered, authenticated user is required to upload a project.");
        }
        if (maxUncompressedBytes <= 0) {
            throw new IllegalStateException("DATAGUARD_REVIEW_MAX_UNCOMPRESSED_BYTES must be greater than zero.");
        }

        Project project = new Project();
        project.setName(projectName);
        project.setUser(user);
        project.setTechnology("Java / Spring Boot");
        project.setCreatedAt(LocalDateTime.now());
        project = projectRepository.save(project);

        Path projectDir = Path.of(storageDirectory, "dataguard_" + project.getId())
                .toAbsolutePath().normalize();
        try {
            Files.createDirectories(projectDir);
            extractZip(file, projectDir.toFile());
            return reviewEngine.runReview(project, projectDir.toFile());
        } catch (IOException | RuntimeException exception) {
            deleteDirectoryQuietly(projectDir);
            throw exception;
        }
    }

    private void extractZip(MultipartFile file, File destDir) throws IOException {
        long extractedBytes = 0;
        int entryCount = 0;
        int fileCount = 0;
        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry zipEntry;
            while ((zipEntry = zis.getNextEntry()) != null) {
                entryCount++;
                File newFile = newFile(destDir, zipEntry);
                if (zipEntry.isDirectory()) {
                    if (!newFile.isDirectory() && !newFile.mkdirs()) {
                        throw new IOException("Failed to create directory in the review workspace.");
                    }
                } else {
                    fileCount++;
                    File parent = newFile.getParentFile();
                    if (!parent.isDirectory() && !parent.mkdirs()) {
                        throw new IOException("Failed to create a directory in the review workspace.");
                    }
                    try (FileOutputStream fos = new FileOutputStream(newFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            extractedBytes += len;
                            if (extractedBytes > maxUncompressedBytes) {
                                throw new InvalidArchiveException(
                                        "The ZIP expands beyond the configured review size limit.");
                            }
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                zis.closeEntry();
            }
        } catch (ZipException exception) {
            throw new InvalidArchiveException("The uploaded file is not a valid ZIP archive.", exception);
        }

        if (entryCount == 0 || fileCount == 0) {
            throw new InvalidArchiveException("The ZIP archive is empty or contains no files to review.");
        }
    }

    private File newFile(File destinationDir, ZipEntry zipEntry) throws IOException {
        File destFile = new File(destinationDir, zipEntry.getName());
        String destDirPath = destinationDir.getCanonicalPath();
        String destFilePath = destFile.getCanonicalPath();
        if (!destFilePath.startsWith(destDirPath + File.separator)) {
            throw new InvalidArchiveException("The ZIP contains a path outside the review workspace.");
        }
        return destFile;
    }

    private void deleteDirectoryQuietly(Path root) {
        if (root == null || !Files.exists(root)) return;
        try (var paths = Files.walk(root)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // Preserve the original upload/review error.
                }
            });
        } catch (IOException ignored) {
            // Preserve the original upload/review error.
        }
    }

    public static class InvalidArchiveException extends IOException {
        private static final long serialVersionUID = 1L;

        public InvalidArchiveException(String message) {
            super(message);
        }

        public InvalidArchiveException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public ProjectService(ProjectRepository projectRepository, ReviewEngine reviewEngine) {
        this.projectRepository = projectRepository;
        this.reviewEngine = reviewEngine;
    }
}
