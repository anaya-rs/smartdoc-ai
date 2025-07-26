import cv2
import numpy as np
import pandas as pd
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import re
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TableExtractor:
    def __init__(self):
        print("Universal TableExtractor initialized")
        
    def extract_tables(self, file_path: str) -> List[Dict]:
        try:
            if file_path.lower().endswith('.pdf'):
                return self._extract_pdf_tables(file_path)
            else:
                return self._extract_image_tables(file_path)
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            return []
    
    def _extract_pdf_tables(self, file_path: str) -> List[Dict]:
        tables = []
        try:
            doc = fitz.open(file_path)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                # Convert to high-res image
                mat = fitz.Matrix(3.0, 3.0)
                pix = page.get_pixmap(matrix=mat, alpha=False)
                img_data = pix.tobytes("png")
                
                # Process as image
                import io
                pil_img = Image.open(io.BytesIO(img_data))
                img_array = np.array(pil_img)
                
                page_tables = self._process_image_for_tables(img_array, page_num + 1)
                tables.extend(page_tables)
                    
            doc.close()
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            
        return tables
    
    def _extract_image_tables(self, file_path: str) -> List[Dict]:
        """Extract tables from image"""
        try:
            image = cv2.imread(file_path)
            if image is None:
                return []
            return self._process_image_for_tables(image, 1)
        except Exception as e:
            logger.error(f"Image processing failed: {e}")
            return []
    
    def _process_image_for_tables(self, image, page_num):
        """Process image to find and extract ALL tables"""
        tables = []
        
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Method 1: Find table regions using contours
        table_regions = self._find_table_regions(gray)
        
        for i, (x, y, w, h) in enumerate(table_regions):
            table_crop = gray[y:y+h, x:x+w]
            table_data = self._extract_table_data(table_crop, i + 1, page_num)
            if table_data:
                table_data['bounding_box'] = {'x': x, 'y': y, 'width': w, 'height': h}
                tables.append(table_data)
        
        # Method 2: If no regions found, process entire image
        if not tables:
            table_data = self._extract_table_data(gray, 1, page_num)
            if table_data:
                h, w = gray.shape
                table_data['bounding_box'] = {'x': 0, 'y': 0, 'width': w, 'height': h}
                tables.append(table_data)
        
        return tables
    
    def _find_table_regions(self, gray):
        """Find potential table regions"""
        regions = []
        
        try:
            # Enhance image
            binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            
            # Detect lines
            h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
            v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
            
            h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
            v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
            
            # Combine
            table_mask = cv2.bitwise_or(h_lines, v_lines)
            
            # Find contours
            contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w > 50 and h > 30:  # Minimum size
                    regions.append((x, y, w, h))
                    
        except Exception:
            pass
            
        return regions
    
    def _extract_table_data(self, image_crop, table_id, page_num):
        """Extract table data using OCR - UNIVERSAL METHOD"""
        try:
            # Multiple OCR attempts with different configs
            configs = [
                r'--oem 3 --psm 6',
                r'--oem 3 --psm 4', 
                r'--oem 3 --psm 12',
                r'--oem 1 --psm 6'
            ]
            
            text = None
            for config in configs:
                try:
                    text = pytesseract.image_to_string(image_crop, config=config)
                    if text and len(text.strip()) > 10:
                        break
                except:
                    continue
            
            if not text or len(text.strip()) < 5:
                return None
            
            # Parse text into table
            rows = self._parse_any_table_format(text)
            
            if len(rows) < 2:
                return None
            
            # Create DataFrame
            headers = rows[0]
            data_rows = rows[1:]
            
            # Normalize columns
            max_cols = len(headers)
            normalized_rows = []
            
            for row in data_rows:
                if len(row) > max_cols:
                    row = row[:max_cols]
                elif len(row) < max_cols:
                    row.extend([''] * (max_cols - len(row)))
                normalized_rows.append(row)
            
            if not normalized_rows:
                return None
            
            df = pd.DataFrame(normalized_rows, columns=headers)
            
            # Clean DataFrame
            df = df.dropna(how='all').reset_index(drop=True)
            if df.empty:
                return None
            
            return {
                'table_id': table_id,
                'page': page_num,
                'accuracy': 80,
                'data': df.to_dict('records'),
                'csv': df.to_csv(index=False),
                'json': df.to_json(orient='records'),
                'extraction_method': 'universal_ocr',
                'rows': len(df),
                'columns': len(df.columns),
                'headers': list(df.columns)
            }
            
        except Exception as e:
            logger.error(f"Table data extraction failed: {e}")
            return None
    
    def _parse_any_table_format(self, text):
        """Parse ANY table format from text"""
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        if not lines:
            return []
        
        rows = []
        
        for line in lines:
            columns = self._split_line_into_columns(line)
            if columns and len(columns) >= 2:
                rows.append(columns)
        
        return rows
    
    def _split_line_into_columns(self, line):
        """Universal column splitting"""
        # Try multiple splitting strategies
        
        # Strategy 1: Multiple spaces
        if re.search(r' {2,}', line):
            cols = [col.strip() for col in re.split(r' {2,}', line) if col.strip()]
            if len(cols) >= 2:
                return cols
        
        # Strategy 2: Tabs
        if '\t' in line:
            cols = [col.strip() for col in line.split('\t') if col.strip()]
            if len(cols) >= 2:
                return cols
        
        # Strategy 3: Pipe symbols
        if '|' in line:
            cols = [col.strip() for col in line.split('|') if col.strip()]
            if len(cols) >= 2:
                return cols
        
        # Strategy 4: Commas (CSV-like)
        if ',' in line and not re.search(r'\d,\d', line):  # Avoid splitting numbers
            cols = [col.strip() for col in line.split(',') if col.strip()]
            if len(cols) >= 2:
                return cols
        
        words = line.split()
        if len(words) >= 2:
            return self._intelligent_word_grouping(words)
        
        return None
    
    def _intelligent_word_grouping(self, words):
        """Group words intelligently into columns"""
        if len(words) == 2:
            return words
        
        numeric_patterns = [
            r'^\d+$',  # Numbers
            r'^\d+\.\d+$',  # Decimals
            r'^\d+\'[\d\"]*$',  # Heights like 5'6"
            r'^\$\d+',  # Currency
            r'^\d+%$',  # Percentages
            r'^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$',  # Dates
        ]
        
        # Find numeric/special columns
        for i in range(len(words)):
            word = words[i]
            if any(re.match(pattern, word) for pattern in numeric_patterns):
                if i == 0:
                    continue
                return [' '.join(words[:i]), ' '.join(words[i:])]
        
        mid = len(words) // 2
        return [' '.join(words[:mid]), ' '.join(words[mid:])]
