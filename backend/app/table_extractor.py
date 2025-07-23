import camelot
import pandas as pd
import pdfplumber
from typing import List, Dict
import cv2
import numpy as np
from PIL import Image
import pytesseract

class TableExtractor:
    def __init__(self):
        pass
    
    def extract_tables(self, file_path: str) -> List[Dict]:
        """Extract tables from document"""
        if file_path.lower().endswith('.pdf'):
            return self._extract_pdf_tables(file_path)
        else:
            return self._extract_image_tables(file_path)
    
    def _extract_pdf_tables(self, file_path: str) -> List[Dict]:
        """Extract tables from PDF using Camelot and pdfplumber"""
        tables = []
        
        try:
            camelot_tables = camelot.read_pdf(file_path, pages='all')
            
            for i, table in enumerate(camelot_tables):
                if table.accuracy > 50:  # Only include tables with decent accuracy
                    table_data = {
                        'table_id': i + 1,
                        'page': table.page,
                        'accuracy': table.accuracy,
                        'data': table.df.to_dict('records'),
                        'csv': table.df.to_csv(index=False),
                        'json': table.df.to_json(orient='records'),
                        'bounding_box': {
                            'x': table._bbox[0] if hasattr(table, '_bbox') else 0,
                            'y': table._bbox[1] if hasattr(table, '_bbox') else 0,
                            'width': table._bbox[2] - table._bbox[0] if hasattr(table, '_bbox') else 0,
                            'height': table._bbox[3] - table._bbox[1] if hasattr(table, '_bbox') else 0
                        },
                        'extraction_method': 'camelot'
                    }
                    tables.append(table_data)
        except Exception as e:
            print(f"Camelot extraction failed: {e}")
        
        if not tables:
            try:
                with pdfplumber.open(file_path) as pdf:
                    for page_num, page in enumerate(pdf.pages):
                        page_tables = page.extract_tables()
                        for i, table in enumerate(page_tables):
                            if table and len(table) > 1:  # Must have header and at least one row
                                df = pd.DataFrame(table[1:], columns=table[0])
                                table_data = {
                                    'table_id': len(tables) + 1,
                                    'page': page_num + 1,
                                    'accuracy': 85,  # Assume good accuracy for pdfplumber
                                    'data': df.to_dict('records'),
                                    'csv': df.to_csv(index=False),
                                    'json': df.to_json(orient='records'),
                                    'extraction_method': 'pdfplumber'
                                }
                                tables.append(table_data)
            except Exception as e:
                print(f"pdfplumber extraction failed: {e}")
        
        return tables
    
    def _extract_image_tables(self, file_path: str) -> List[Dict]:
        """Extract tables from image using OpenCV and OCR"""
        tables = []
        
        try:
            image = cv2.imread(file_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            table_contours = self._detect_table_structure(gray)
            
            for i, contour in enumerate(table_contours):
                x, y, w, h = cv2.boundingRect(contour)
                table_region = gray[y:y+h, x:x+w]
                
                table_text = pytesseract.image_to_string(table_region, config=r'--oem 3 --psm 6')
                
                rows = self._parse_table_text(table_text)
                
                if len(rows) > 1:  # Must have at least header and one row
                    df = pd.DataFrame(rows[1:], columns=rows[0])
                    table_data = {
                        'table_id': i + 1,
                        'page': 1,
                        'accuracy': 70,  # Estimate for image tables
                        'data': df.to_dict('records'),
                        'csv': df.to_csv(index=False),
                        'json': df.to_json(orient='records'),
                        'bounding_box': {
                            'x': int(x),
                            'y': int(y),
                            'width': int(w),
                            'height': int(h)
                        },
                        'extraction_method': 'opencv_ocr'
                    }
                    tables.append(table_data)
        
        except Exception as e:
            print(f"Image table extraction failed: {e}")
        
        return tables
    
    def _detect_table_structure(self, gray_image: np.ndarray) -> List:
        """Detect table structure using OpenCV"""
        _, thresh = cv2.threshold(gray_image, 150, 255, cv2.THRESH_BINARY_INV)
        
        horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        
        horizontal_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel)
        vertical_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel)
        
        table_mask = cv2.addWeighted(horizontal_lines, 0.5, vertical_lines, 0.5, 0.0)
        
        contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        table_contours = [c for c in contours if cv2.contourArea(c) > 1000]
        
        return table_contours
    
    def _parse_table_text(self, text: str) -> List[List[str]]:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        rows = []
        
        for line in lines:
            columns = [col.strip() for col in line.split('\t') if col.strip()]
            if not columns:
                columns = [col.strip() for col in line.split('  ') if col.strip()]
            
            if columns:
                rows.append(columns)
        
        return rows
