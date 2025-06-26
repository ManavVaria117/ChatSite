import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5001/api/ai"
TEST_MESSAGES = [
    "Hello, how are you doing today?",
    "I'm really excited about our new project!",
    "Can you help me with something?",
    "I'm feeling a bit down today.",
    "What do you think about artificial intelligence?",
]


def print_test_header(test_name):
    print(f"\n{'='*50}")
    print(f"{test_name.upper():^50}")
    print(f"{'='*50}")

def test_health_check():
    print_test_header("Health Check")
    start_time = time.time()
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        elapsed = (time.time() - start_time) * 1000
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}ms")
        print(f"Headers: {json.dumps(dict(response.headers), indent=2)}")
        
        try:
            data = response.json()
            print("Response JSON:")
            print(json.dumps(data, indent=2))
        except Exception as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Raw Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False
    
    return response.status_code == 200

def test_generate_replies():
    print_test_header("Smart Replies")
    
    for i, message in enumerate(TEST_MESSAGES, 1):
        print(f"\nTest {i}: {message}")
        print("-" * 50)
        
        data = {"message": message}
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{BASE_URL}/generate-replies", 
                json=data,
                timeout=30
            )
            elapsed = (time.time() - start_time) * 1000
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Time: {elapsed:.2f}ms")
            
            try:
                data = response.json()
                print("Response JSON:")
                print(json.dumps(data, indent=2))
                
                # Validate response structure
                if "replies" not in data:
                    print(" Error: 'replies' key missing from response")
                elif not isinstance(data["replies"], list):
                    print(f" Error: 'replies' is not a list: {type(data['replies'])}")
                elif not data["replies"]:
                    print("  Warning: Empty replies list")
                else:
                    print(f" Successfully received {len(data['replies'])} replies")
                    
            except Exception as e:
                print(f" Failed to parse JSON: {e}")
                print(f"Raw Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f" Request failed: {e}")

def test_analyze_sentiment():
    print_test_header("Sentiment Analysis")
    
    for i, message in enumerate(TEST_MESSAGES, 1):
        print(f"\nTest {i}: {message}")
        print("-" * 50)
        
        data = {"message": message}
        
        try:
            start_time = time.time()
            response = requests.post(
                f"{BASE_URL}/analyze-sentiment", 
                json=data,
                timeout=10
            )
            elapsed = (time.time() - start_time) * 1000
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Time: {elapsed:.2f}ms")
            
            try:
                data = response.json()
                print("Response JSON:")
                print(json.dumps(data, indent=2))
                
                # Validate response structure
                if "sentiment" not in data:
                    print(" Error: 'sentiment' key missing from response")
                elif data["sentiment"] not in ["positive", "negative", "neutral"]:
                    print(f"  Warning: Unexpected sentiment value: {data['sentiment']}")
                else:
                    print(f" Successfully analyzed sentiment: {data['sentiment']}")
                    
            except Exception as e:
                print(f" Failed to parse JSON: {e}")
                print(f"Raw Response: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f" Request failed: {e}")

if __name__ == "__main__":
    print(f"\n{'*'*60}")
    print(f"*{'API TEST SESSION':^58}*")
    print(f"*{'='*58}*")
    print(f"* {'Time:':<15} {datetime.now().strftime('%Y-%m-%d %H:%M:%S'):<40} *")
    print(f"* {'Base URL:':<15} {BASE_URL:<40} *")
    print(f"{'*'*60}\n")
    
    # Run tests
    test_health_check()
    test_generate_replies()
    test_analyze_sentiment()
    
    print("\nTest session completed!")