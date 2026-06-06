FROM php:8.2-apache

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    APACHE_DOCUMENT_ROOT=/var/www/html \
    TZ=Asia/Jakarta

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        libfreetype6-dev \
        libicu-dev \
        libjpeg62-turbo-dev \
        libonig-dev \
        libpng-dev \
        libtidy-dev \
        libwebp-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        exif \
        gd \
        intl \
        mbstring \
        mysqli \
        opcache \
        pdo_mysql \
        soap \
        sockets \
        tidy \
        zip \
    && a2enmod rewrite headers expires remoteip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY --chown=www-data:www-data . .
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php/opensid.ini /usr/local/etc/php/conf.d/opensid.ini
COPY docker/entrypoint.sh /usr/local/bin/opensid-entrypoint

RUN chmod +x /usr/local/bin/opensid-entrypoint \
    && mkdir -p \
        desa/config \
        desa/cache \
        desa/upload \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
    && composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction \
    && mkdir -p /usr/src/opensid-seed \
    && cp -a desa /usr/src/opensid-seed/desa \
    && cp -a storage /usr/src/opensid-seed/storage \
    && chown -R www-data:www-data /var/www/html /usr/src/opensid-seed

EXPOSE 80

ENTRYPOINT ["opensid-entrypoint"]
CMD ["apache2-foreground"]
