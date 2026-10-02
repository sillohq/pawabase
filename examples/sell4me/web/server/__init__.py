"""The Sell4me web app: Inertia + React in the browser, Pawabase behind it.

This server owns no database. Every page's props are fetched from a Pawabase project (``pawabase`` Python kit, over ``httpx``) as the signed-in user, and every form
post is forwarded to it. The browser also talks to Pawabase directly with ``@pawabase/client`` where that is the better fit (realtime help desk).
"""
