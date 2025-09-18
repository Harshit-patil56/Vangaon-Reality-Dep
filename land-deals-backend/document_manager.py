import os
import time
from werkzeug.utils import secure_filename

class DocumentManager:
    """Simple document manager for handling file uploads"""
    
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
        # Ensure upload folder exists
        os.makedirs(upload_folder, exist_ok=True)
        
        # Define document types for different categories
        self.document_types = {
            'land': [
                'extract', 'property_card', 'survey_map', 'demarcation_certificate',
                'development_plan', 'encumbrance_certificate'
            ],
            'owner': [
                'identity_proof', 'address_proof', 'owner_photograph', 'bank_details',
                'power_of_attorney', 'past_sale_deeds', 'noc_co_owners', 'noc_society',
                'affidavit_no_dispute'
            ],
            'investor': [
                'identity_proof', 'address_proof', 'investor_photograph', 'bank_details',
                'investment_agreement', 'financial_proof', 'partnership_agreement',
                'loan_agreement', 'power_of_attorney'
            ]
        }
    
    def save_document(self, file, category, deal_id=None, owner_id=None, person_id=None, document_type=None, uploaded_by=None):
        """Save a document with organized folder structure"""
        try:
            if not file or not file.filename:
                return {'error': 'No file provided'}
            
            # Secure the filename
            filename = secure_filename(file.filename)
            if not filename:
                return {'error': 'Invalid filename'}
            
            # Add timestamp to prevent conflicts
            timestamp = str(int(time.time()))
            base_name, ext = os.path.splitext(filename)
            safe_filename = f"{base_name}_{timestamp}{ext}"
            
            # Create organized folder structure based on category
            if category == 'land' and deal_id:
                folder_path = os.path.join(self.upload_folder, f"deal_{deal_id}")
            elif category == 'owner' and deal_id and person_id:
                folder_path = os.path.join(self.upload_folder, f"deal_{deal_id}", f"owner_{person_id}", document_type or "documents")
            elif category == 'investor' and deal_id and person_id:
                folder_path = os.path.join(self.upload_folder, f"deal_{deal_id}", f"investor_{person_id}", document_type or "documents")
            elif deal_id:
                folder_path = os.path.join(self.upload_folder, f"deal_{deal_id}")
            elif owner_id:
                folder_path = os.path.join(self.upload_folder, f"owner_{owner_id}")
            else:
                folder_path = os.path.join(self.upload_folder, "misc")
            
            # Ensure directory exists
            os.makedirs(folder_path, exist_ok=True)
            
            # Full file path
            file_path = os.path.join(folder_path, safe_filename)
            
            # Save the file
            file.save(file_path)
            
            # Get file size
            file_size = os.path.getsize(file_path)
            
            return {
                'success': True,
                'file_path': file_path,
                'filename': safe_filename,
                'file_size': file_size,
                'relative_path': os.path.relpath(file_path, self.upload_folder),
                'web_path': os.path.relpath(file_path, self.upload_folder).replace('\\', '/')
            }
            
        except Exception as e:
            return {'error': f'Failed to save document: {str(e)}'}
    
    def delete_document(self, file_path):
        """Delete a document file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                return {'success': True, 'message': 'Document deleted'}
            else:
                return {'error': 'File not found'}
        except Exception as e:
            return {'error': f'Failed to delete document: {str(e)}'}
    
    def get_document_path(self, relative_path):
        """Get full path from relative path"""
        return os.path.join(self.upload_folder, relative_path)
    
    def get_document_url(self, web_path):
        """Get URL for document access"""
        # Convert to forward slashes for web URLs
        normalized_path = web_path.replace('\\', '/')
        return f"/uploads/{normalized_path}"

# Global instance
_document_manager = None

def get_document_manager(upload_folder):
    """Get or create document manager instance"""
    global _document_manager
    if _document_manager is None:
        _document_manager = DocumentManager(upload_folder)
    return _document_manager