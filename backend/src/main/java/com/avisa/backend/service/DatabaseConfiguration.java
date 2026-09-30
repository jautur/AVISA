package com.avisa.backend.service;

import com.zaxxer.hikari.HikariDataSource;
import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayConfigurationCustomizer;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

@Configuration
public class DatabaseConfiguration {
    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource dataSource(Environment environment) {
        DatabaseUrl database = DatabaseUrl.parse(
                environment.getRequiredProperty("DATABASE_URL"),
                environment.getProperty("DATABASE_USERNAME"),
                environment.getProperty("DATABASE_PASSWORD")
        );

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(database.jdbcUrl());
        if (database.username() != null) {
            dataSource.setUsername(database.username());
        }
        if (database.password() != null) {
            dataSource.setPassword(database.password());
        }
        dataSource.setDriverClassName("org.postgresql.Driver");
        return dataSource;
    }

    @Bean
    public FlywayConfigurationCustomizer flywayDatabaseUrlCustomizer(Environment environment) {
        String migrationUrl = environment.getProperty(
                "DATABASE_URL_UNPOOLED",
                environment.getRequiredProperty("DATABASE_URL")
        );
        DatabaseUrl database = DatabaseUrl.parse(
                migrationUrl,
                environment.getProperty("DATABASE_USERNAME"),
                environment.getProperty("DATABASE_PASSWORD")
        );
        return (FluentConfiguration configuration) -> configuration.dataSource(
                database.jdbcUrl(), database.username(), database.password()
        );
    }

    private record DatabaseUrl(String jdbcUrl, String username, String password) {
        private static DatabaseUrl parse(String value, String fallbackUsername, String fallbackPassword) {
            if (value.startsWith("jdbc:postgresql://")) {
                return new DatabaseUrl(value, fallbackUsername, fallbackPassword);
            }

            URI uri;
            try {
                uri = URI.create(value);
            } catch (IllegalArgumentException exception) {
                throw new IllegalStateException(
                        "DATABASE_URL must be a PostgreSQL JDBC URL or a Neon postgresql:// connection string"
                );
            }

            if (!"postgresql".equals(uri.getScheme()) && !"postgres".equals(uri.getScheme())) {
                throw new IllegalStateException(
                        "DATABASE_URL must use postgresql:// or jdbc:postgresql://"
                );
            }

            String host = uri.getHost();
            if (host == null || uri.getRawPath() == null || uri.getRawPath().isBlank()) {
                throw new IllegalStateException("DATABASE_URL is missing its database host or name");
            }

            String username = fallbackUsername;
            String password = fallbackPassword;
            if (uri.getRawUserInfo() != null) {
                String[] credentials = uri.getRawUserInfo().split(":", 2);
                username = decode(credentials[0]);
                if (credentials.length == 2) {
                    password = decode(credentials[1]);
                }
            }

            String jdbcHost = host.contains(":") && !host.startsWith("[") ? "[" + host + "]" : host;
            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(jdbcHost);
            if (uri.getPort() >= 0) {
                jdbcUrl.append(':').append(uri.getPort());
            }
            jdbcUrl.append(uri.getRawPath());
            if (uri.getRawQuery() != null && !uri.getRawQuery().isBlank()) {
                jdbcUrl.append('?').append(uri.getRawQuery());
            }
            return new DatabaseUrl(jdbcUrl.toString(), username, password);
        }

        private static String decode(String value) {
            return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
        }
    }
}
