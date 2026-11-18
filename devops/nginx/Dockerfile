FROM nginx:1.27-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=6 \
    CMD wget -q --spider http://127.0.0.1/gateway-health
