import urllib.request
import json
import os

def get_poly_haven_assets():
    req = urllib.request.Request('https://api.polyhaven.com/assets?type=textures')
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

def get_poly_haven_models():
    req = urllib.request.Request('https://api.polyhaven.com/assets?type=models')
    req.add_header('User-Agent', 'Mozilla/5.0')
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode('utf-8'))

if __name__ == '__main__':
    ph_textures = get_poly_haven_assets()
    with open('ph_textures.json', 'w') as f:
        json.dump(ph_textures, f)
        
    ph_models = get_poly_haven_models()
    with open('ph_models.json', 'w') as f:
        json.dump(ph_models, f)
