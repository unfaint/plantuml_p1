FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache wget graphviz \
 && wget -q -O plantuml.jar \
      https://github.com/plantuml/plantuml/releases/download/v1.2026.2/plantuml-1.2026.2.jar
EXPOSE 8080
CMD ["java", "-jar", "/app/plantuml.jar", "-picoweb:8080"]
