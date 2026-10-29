
FROM php:8.2-apache

# Install PHP extensions required by Laravel and MySQL.
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install pdo_mysql zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

# Install Composer.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copy the Laravel application.
COPY . .

# Install production dependencies and run Laravel's Composer scripts.
RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

# Configure Apache to serve Laravel's public directory.
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri \
    's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/000-default.conf \
    && sed -ri \
    's!/var/www/!${APACHE_DOCUMENT_ROOT}/!g' \
    /etc/apache2/apache2.conf \
    && printf '<Directory /var/www/html/public>\n\
    AllowOverride All\n\
    Require all granted\n\
</Directory>\n' >> /etc/apache2/apache2.conf

# Prepare Laravel writable directories.
RUN mkdir -p \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Render uses the PORT environment variable (default 10000).
EXPOSE 10000

# Configure Apache to listen on Render's assigned port.
CMD ["bash", "-c", "PORT=${PORT:-10000}; sed -i \"s/^Listen 80$/Listen ${PORT}/\" /etc/apache2/ports.conf && sed -i \"s/<VirtualHost \\*:80>/<VirtualHost *:${PORT}>/\" /etc/apache2/sites-available/000-default.conf && exec apache2-foreground"]
