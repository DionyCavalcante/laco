FROM node:20-alpine

WORKDIR /app

# Copiar tudo
COPY . .

# Build dos frontends
RUN cd frontend/agendador && npm install && npm run build && cd /app && \
    cd frontend/admin && npm install && npm run build && cd /app

# Install backend
RUN cd backend && npm install

# Migrations e start
CMD cd backend && npm run migrate && npm start
