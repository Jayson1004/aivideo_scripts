# 1. Use an official Python runtime as a parent image
FROM python:3.11-slim

# 2. Set the working directory in the container
WORKDIR /app

# 3. Install uv, the package manager
RUN pip install uv

# 4. Copy the entire application's source code
COPY . .

# 5. Install project dependencies using the pyproject.toml in the current directory.
#    'pip install .' resolves and installs all direct and transitive dependencies.
RUN uv pip install --system .

# 7. Expose the port the app runs on
EXPOSE 8000

# 8. Define the command to run the application
#    --host 0.0.0.0 makes the server accessible from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
