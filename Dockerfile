FROM node:20-alpine

WORKDIR /app

# Copia arquivos de configuração e source
COPY package*.json tsconfig.json ./
COPY src ./src

# Instala dependências e faz build
RUN npm install && npm run build

# Exponha a porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production

# Inicia a aplicação
CMD ["node", "dist/server.js"]
