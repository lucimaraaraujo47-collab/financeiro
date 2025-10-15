#!/usr/bin/env python3
"""
Simple test to verify WhatsApp transaction creation and empresa assignment
"""

import requests
import json

BACKEND_URL = "https://echo-finance.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@echoshop.com"
ADMIN_PASSWORD = "admin123"
EMPRESA_ID = "226b58c1-4a48-4b66-9537-0dbf9fa65500"

def test_login_and_transactions():
    # Login
    login_data = {"email": ADMIN_EMAIL, "senha": ADMIN_PASSWORD}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return False
    
    token = response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Get transactions
    response = requests.get(f"{BACKEND_URL}/empresas/{EMPRESA_ID}/transacoes", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get transactions: {response.status_code} - {response.text}")
        return False
    
    transactions = response.json()
    print(f"✅ Retrieved {len(transactions)} transactions")
    
    # Check for WhatsApp transactions
    whatsapp_txns = [t for t in transactions if t.get('origem') == 'whatsapp']
    print(f"   WhatsApp transactions: {len(whatsapp_txns)}")
    
    # Show recent transactions
    for t in transactions[-5:]:  # Last 5
        print(f"   ID: {t.get('id')[:8]}..., Fornecedor: {t.get('fornecedor')}, Valor: R$ {t.get('valor_total')}, Origem: {t.get('origem')}, Empresa: {t.get('empresa_id')}")
    
    # Verify all transactions have correct empresa_id
    wrong_empresa = [t for t in transactions if t.get('empresa_id') != EMPRESA_ID]
    if wrong_empresa:
        print(f"❌ {len(wrong_empresa)} transactions have wrong empresa_id")
        for t in wrong_empresa:
            print(f"   Wrong: {t.get('id')} -> {t.get('empresa_id')}")
        return False
    else:
        print("✅ All transactions have correct empresa_id")
        return True

if __name__ == "__main__":
    test_login_and_transactions()