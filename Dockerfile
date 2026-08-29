# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Stage 1: assemble only the static files PAUSE needs at runtime.
# PAUSE has no compile/build step, so this stage acts as a strict runtime
# allowlist and keeps tests, Git metadata, papers, screenshots, etc. out of the
# production image.
# -----------------------------------------------------------------------------
FROM scratch AS site

COPY index.html favicon.svg /site/
COPY pages/*.html /site/pages/
COPY css/*.css /site/css/
COPY js/*.js /site/js/
COPY data/site.json /site/data/site.json
COPY data/pages/*.json /site/data/pages/
COPY data/content/*.md /site/data/content/
COPY data/instrument/*.json /site/data/instrument/
COPY fonts/*.woff2 /site/fonts/

COPY media/figure1-theoretical-framework.png \
     media/item-b5-anatomy.png \
     media/compare-chart.png \
     media/compare-deltas.png \
     media/offloading-pattern-demo.png \
     media/compare-demo.png \
     media/compare-narrated-analysis.png \
     /site/media/

# Keep redistribution notices in the image, but outside the public web root.
COPY LICENSE LICENSE-CONTENT.md /licenses/
COPY fonts/OFL-*.txt /licenses/fonts/

# -----------------------------------------------------------------------------
# Stage 2: small production web server.
# Requirements addressed here:
#   - process runs as non-root UID 1000
#   - startup script is in WORKDIR
#   - app listens on port 8080
# -----------------------------------------------------------------------------
FROM nginx:stable-alpine AS runtime

RUN addgroup -S -g 1000 pause \
    && adduser -S -D -H -u 1000 -G pause pause \
    && mkdir -p /app/site /licenses \
    && chown -R 1000:1000 /app /licenses

COPY nginx.conf /etc/nginx/nginx.conf
COPY --chown=1000:1000 start-script.sh /app/start-script.sh
COPY --from=site --chown=1000:1000 /site/ /app/site/
COPY --from=site --chown=1000:1000 /licenses/ /licenses/

RUN chmod 0555 /app/start-script.sh

WORKDIR /app
USER 1000:1000

EXPOSE 8080

ENTRYPOINT ["./start-script.sh"]
