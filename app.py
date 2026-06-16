import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    # Fetch feed using standard library urllib
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Antigravity/1.0'}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'ns': 'http://www.w3.org/2005/Atom'}
    
    feed_title_el = root.find('ns:title', ns)
    feed_title = feed_title_el.text if feed_title_el is not None else "BigQuery Release Notes"
    
    feed_updated_el = root.find('ns:updated', ns)
    feed_updated = feed_updated_el.text if feed_updated_el is not None else ""
    
    entries = []
    for entry_el in root.findall('ns:entry', ns):
        entry_id_el = entry_el.find('ns:id', ns)
        entry_id = entry_id_el.text if entry_id_el is not None else ""
        
        title_el = entry_el.find('ns:title', ns)
        title = title_el.text if title_el is not None else ""
        
        updated_el = entry_el.find('ns:updated', ns)
        updated = updated_el.text if updated_el is not None else ""
        
        content_el = entry_el.find('ns:content', ns)
        content = content_el.text if content_el is not None else ""
        
        entries.append({
            'id': entry_id,
            'title': title,
            'updated': updated,
            'content': content
        })
        
    return {
        'feed_title': feed_title,
        'feed_updated': feed_updated,
        'entries': entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        data = fetch_and_parse_feed()
        return jsonify(data)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Start flask application
    app.run(debug=True, port=5000)
