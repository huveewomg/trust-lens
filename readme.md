Proof of Concept on how to system should works and look like
Reference / Ideas:
```
https://docs.virustotal.com/reference/overview

```
Singapore main scam related website:
- https://www.scamshield.gov.sg/
- https://www.mas.gov.sg/investor-alert-list


Indonesia Related:
https://investors.fico.com/news-releases/news-release-details/fico-survey-1-4-indonesian-consumers-report-losing-money-scams


How to setup the environment for development:
```
cd my-fastapi-app
python -m venv venv //1 time setup
source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

uvicorn app.main:app --reload --env-file .env // use this to load locally for development
```

```
change script.js Line 72 to point to : http://127.0.0.1:8000/predict/ 

```

another terminal window:
```
python -m http.server 8080
```

