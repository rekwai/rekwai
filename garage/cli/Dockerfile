FROM alpine:latest

# Copy garage binary directly from the garage image
COPY --from=dxflrs/garage:v1.3.1 /garage /usr/local/bin/garage

# Copy configuration (it'll be hardcoded) & init script
COPY ./garage-init.sh /garage-init.sh
COPY ./garage-init.toml /etc/garage.toml

CMD ["sh", "/garage-init.sh"]
