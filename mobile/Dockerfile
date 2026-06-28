FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app

# Cache dependencies first
COPY pubspec.yaml ./
RUN flutter pub get

# Build the web app
COPY . .
ARG API_BASE_URL=http://localhost:4000
RUN flutter create --platforms=web . \
 && flutter build web --release --dart-define=API_BASE_URL=$API_BASE_URL

FROM nginx:alpine AS runtime
COPY --from=build /app/build/web /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
