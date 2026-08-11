FROM dunglas/frankenphp:php8.5

# install-php-extensions liegt im FrankenPHP-Image bereits vor.
RUN install-php-extensions \
        pdo_mysql \
        redis \
        opcache \
        intl \
        zip \
        pcntl

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Bewusst kein COPY der Anwendung: im Dev hängt api/ per Bind-Mount hier drin.
# Ein Deploy-Image bekommt später COPY . /app plus composer install --no-dev
# und einen zweiten Stage. Solange nichts deployt wird, wäre das totes Gewicht.
