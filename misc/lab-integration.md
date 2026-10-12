# Lab result intake

The app accepts final FHIR R4 `DiagnosticReport` resources at `POST /api/integrations/labs`.

## Configure

Set a long random `LAB_INTEGRATION_TOKEN` in the server environment and configure the laboratory interface to send it as a bearer token. Keep the token server-side; do not expose it in browser code. The result patient's `subject.identifier.value` must equal the patient's account email, or `subject.reference` must be `Patient/<patient-email>`. Reports must include an `id`, test name (`code.text` or a coding display), and clinical conclusion (`conclusion` or `conclusionCode`).

Example request:

```http
POST /api/integrations/labs
Authorization: Bearer <configured-token>
Content-Type: application/fhir+json
```

```json
{
  "resourceType": "DiagnosticReport",
  "id": "lab-report-10042",
  "status": "final",
  "subject": { "identifier": { "value": "patient@example.com" } },
  "code": { "text": "Complete blood count" },
  "conclusion": "Haemoglobin within the supplied reference range.",
  "performer": [{ "display": "Example Laboratory" }]
}
```

Imported reports are de-duplicated by source and report ID, stored as pending review, and are not automatically released to the patient. The intake supports a report conclusion and requires the sender to map its patient identifier into this app's email identifier. A lab vendor-specific interface, transport setup, terminology mapping, and credentials still need to be agreed with that vendor before a live connection can operate.
