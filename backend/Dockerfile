FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn --batch-mode -DskipTests package

FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && python3 -m venv /opt/semgrep \
    && /opt/semgrep/bin/pip install --no-cache-dir semgrep \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /workspace/target/dataguard-backend-0.0.1-SNAPSHOT.jar /app/app.jar
ENV SEMGREP_ENABLED=true
ENV SEMGREP_EXECUTABLE=/opt/semgrep/bin/semgrep
ENV SEMGREP_CONFIG=p/security-audit
ENV SEMGREP_TIMEOUT_SECONDS=90
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
