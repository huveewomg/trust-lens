# My FastAPI App

This is a simple web application built using FastAPI. It serves as a demonstration of how to create a RESTful API with FastAPI, including routing, static files, and HTML templates.

## Project Structure

```
my-fastapi-app
├── app
│   ├── __init__.py
│   ├── main.py
│   ├── routers
│   │   ├── __init__.py
│   │   └── items.py
│   ├── static
│   │   └── css
│   │       └── style.css
│   └── templates
│       └── index.html
├── requirements.txt
└── README.md
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd my-fastapi-app
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install the requirements:**
   ```bash
   pip install -r requirements.txt
   ```

## Usage

To run the application, execute the following command:

```bash
uvicorn app.main:app --reload
```

Visit `http://127.0.0.1:8000` in your browser to access the application.

## API Endpoints

- **GET /items/**: Retrieve a list of items.
- **POST /items/**: Create a new item.
- **PUT /items/{item_id}**: Update an existing item.
- **DELETE /items/{item_id}**: Delete an item.

## License

This project is licensed under the MIT License. See the LICENSE file for details.