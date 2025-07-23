import re
from typing import Dict, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import pickle
import os

class DocumentClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.classifier = MultinomialNB()
        self.document_types = ['invoice', 'receipt', 'contract', 'id_document', 'other']
        self.is_trained = False
        
        self._load_model()
        
        if not self.is_trained:
            self._train_with_sample_data()
    
    def classify_document(self, text: str) -> Dict:
        if not self.is_trained:
            return {'type': 'other', 'confidence': 0.5}
        
        processed_text = self._preprocess_text(text)
        
        text_vector = self.vectorizer.transform([processed_text])
        
        probabilities = self.classifier.predict_proba(text_vector)[0]
        predicted_class = self.classifier.predict(text_vector)[0]
        confidence = max(probabilities)
        
        prob_dict = dict(zip(self.document_types, probabilities))
        sorted_predictions = sorted(prob_dict.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'type': predicted_class,
            'confidence': float(confidence),
            'alternatives': [
                {'type': pred[0], 'confidence': float(pred[1])}
                for pred in sorted_predictions[:3]
            ]
        }
    
    def _preprocess_text(self, text: str) -> str:
        text = text.lower()
        
        text = re.sub(r'[^\w\s\.\,\:\-\$]', ' ', text)
        
        text = ' '.join(text.split())
        
        return text
    
    def _train_with_sample_data(self):
        training_data = [
            # Invoices
            ("invoice number total amount due date payment terms vendor", "invoice"),
            ("bill invoice amount tax subtotal total due remit payment", "invoice"),
            ("invoice date description quantity rate amount total", "invoice"),
            ("vendor invoice billing address amount due net terms", "invoice"),
            
            # Receipts
            ("receipt store purchased items total tax cash change", "receipt"),
            ("thank you purchase receipt total amount paid", "receipt"),
            ("store receipt transaction date items purchased total", "receipt"),
            ("retail receipt purchase date amount tendered change", "receipt"),
            
            # Contracts
            ("agreement contract terms conditions party signatures date", "contract"),
            ("contract agreement whereas party obligations terms", "contract"),
            ("legal agreement contract effective date termination", "contract"),
            ("service agreement contract terms payment schedule", "contract"),
            
            # ID Documents
            ("license number date birth address height weight", "id_document"),
            ("identification card number expiration date issued", "id_document"),
            ("passport number nationality date birth place", "id_document"),
            ("driver license class restrictions endorsements", "id_document"),
            
            # Other
            ("report document information data analysis results", "other"),
            ("letter correspondence regarding matter discussed", "other"),
            ("memo memorandum subject date distribution", "other"),
            ("form application please complete information", "other")
        ]
        
        texts = [item[0] for item in training_data]
        labels = [item[1] for item in training_data]
        
        X = self.vectorizer.fit_transform(texts)
        self.classifier.fit(X, labels)
        self.is_trained = True

        self._save_model()
    
    def _save_model(self):
        model_dir = "models"
        os.makedirs(model_dir, exist_ok=True)
        
        with open(f"{model_dir}/vectorizer.pkl", "wb") as f:
            pickle.dump(self.vectorizer, f)
        
        with open(f"{model_dir}/classifier.pkl", "wb") as f:
            pickle.dump(self.classifier, f)
    
    def _load_model(self):
        
        try:
            with open("models/vectorizer.pkl", "rb") as f:
                self.vectorizer = pickle.load(f)
            
            with open("models/classifier.pkl", "rb") as f:
                self.classifier = pickle.load(f)
            
            self.is_trained = True
        except FileNotFoundError:
            pass
    
    def get_document_features(self, text: str) -> Dict:
        features = {
            'has_invoice_keywords': bool(re.search(r'\b(invoice|bill|amount due|payment)\b', text, re.I)),
            'has_receipt_keywords': bool(re.search(r'\b(receipt|purchased|total|tax|change)\b', text, re.I)),
            'has_contract_keywords': bool(re.search(r'\b(agreement|contract|terms|whereas|party)\b', text, re.I)),
            'has_id_keywords': bool(re.search(r'\b(license|identification|passport|date of birth)\b', text, re.I)),
            'has_currency': bool(re.search(r'[\$£€¥]\d+|\d+\.\d{2}', text)),
            'has_dates': bool(re.search(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}', text)),
            'has_addresses': bool(re.search(r'\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)', text, re.I)),
            'word_count': len(text.split()),
            'line_count': len(text.split('\n'))
        }
        
        return features
