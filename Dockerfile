# PAUSE is a static site; this image just serves the repository with nginx.
#   docker build -t pause .
#   docker run -p 8080:80 pause
FROM nginx:alpine
COPY index.html favicon.svg /usr/share/nginx/html/
COPY pages/ /usr/share/nginx/html/pages/
COPY css/   /usr/share/nginx/html/css/
COPY js/    /usr/share/nginx/html/js/
COPY data/  /usr/share/nginx/html/data/
COPY fonts/ /usr/share/nginx/html/fonts/
