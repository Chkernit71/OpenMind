import httpx
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import asyncio
import logging

logger = logging.getLogger(__name__)

async def crawl_site(start_url: str) -> str:
    """
    Crawls up to 10 internal pages starting from start_url and extracts clean text.
    """
    visited = set()
    to_visit = [start_url]
    all_text = []
    
    logger.info(f"Starting crawl for: {start_url}")
    
    headers = {
        "User-Agent": "OpenMindBot/1.0"
    }
    
    async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers=headers) as client:
        while to_visit and len(visited) < 10:
            current_url = to_visit.pop(0)
            if current_url in visited:
                continue
            
            try:
                visited.add(current_url)
                logger.info(f"Crawling page {len(visited)}: {current_url}")
                
                response = await client.get(current_url)
                if response.status_code != 200:
                    logger.warning(f"Failed to fetch {current_url}: Status {response.status_code}")
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract links for further crawling
                if len(visited) < 10:
                    for link in soup.find_all('a', href=True):
                        full_url = urljoin(current_url, link['href'])
                        # Only follow internal links
                        if urlparse(full_url).netloc == urlparse(start_url).netloc:
                            # Strip fragment
                            full_url = full_url.split('#')[0]
                            if full_url not in visited and full_url not in to_visit:
                                to_visit.append(full_url)
                
                # Clean content
                for element in soup(['script', 'style', 'nav', 'footer', 'header', 'noscript', 'iframe']):
                    element.decompose()
                
                text = soup.get_text(separator="\n", strip=True)
                # Remove blank lines
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                clean_text = "\n".join(lines)
                
                if clean_text:
                    all_text.append(clean_text)
                    logger.info(f"Extracted {len(clean_text)} characters from {current_url}")
                else:
                    logger.warning(f"No text extracted from {current_url}")
                    
            except Exception as e:
                logger.error(f"Error crawling {current_url}: {str(e)}")
                continue
    
    combined_result = "\n\n---\n\n".join(all_text)
    logger.info(f"Crawl complete. Total characters: {len(combined_result)}")
    return combined_result[:15000]
