FROM node:26.13.0-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json langgraph.json .gitignore .prettierrc.json .prettierignore ./
COPY src ./src
RUN mkdir -p /app/.langgraph_api && chown node:node /app/.langgraph_api
USER node
CMD ["npm", "run", "adapter"]
