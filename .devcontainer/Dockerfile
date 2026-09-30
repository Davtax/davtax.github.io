FROM mcr.microsoft.com/devcontainers/jekyll

# Remove the broken Yarn repository.
# Yarn is already provided by the dev-container features/NVM.
RUN rm -f /etc/apt/sources.list.d/yarn.list

# Let the non-root dev user install gems (e.g. ruby-lsp from the VS Code extension).
RUN chown -R vscode:vscode /usr/local/bundle
