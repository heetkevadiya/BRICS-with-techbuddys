"""Generate a realistic, multilingual citizen-request history (last 180 days) for the demo.

Seeded requests are pre-structured from templates (ai_model = 'seed-template') so the demo does not spend
thousands of Gemini calls; live submissions go through the real pipeline. Cluster centroids ARE real Gemini
embeddings of each issue, so live requests land in the right seeded cluster.
Run: python -m scripts.generate_synthetic_requests --n 3000
"""
from __future__ import annotations

import argparse
import random
from datetime import datetime, timedelta, timezone

from app.db.session import SessionLocal
from app.models import Channel, CitizenRequest, Demographics, GeographicEntity, GeoLevel, ProcessingStatus, RequestCluster
from app.services.ai import gemini_client
from app.services.clustering_service import refresh_cluster_stats
from app.utils.hashing import citizen_hash, new_tracking_code

rng = random.Random(7)

# Census demographics and indices cover all 640 districts of India; citizen reports are generated for
# the state where the pilot is live. Widening the pilot is a change to this constant, nothing else.
PILOT_STATE = "Gujarat"

# ---- issue templates: category → list of (sub_category, urgency, problem_en, {lang: [phrasings]}) ---------------
T = {
    "ROADS": [
        ("damaged road", 8, "Village approach road is severely damaged; ambulances and buses cannot reach during rain.",
         {"gu": ["અમારા ગામનો રસ્તો સાવ તૂટી ગયો છે, વરસાદમાં એમ્બ્યુલન્સ આવી શકતી નથી.", "રસ્તા પર મોટા ખાડા છે, બસ ગામમાં આવતી બંધ થઈ ગઈ છે."],
          "hi": ["गाँव की सड़क पूरी तरह टूटी हुई है, बारिश में एम्बुलेंस नहीं आ पाती।", "सड़क में बड़े गड्ढे हैं, बस गाँव में आना बंद हो गई है।"],
          "hi-Latn": ["Gaon ki road bilkul tut gayi hai, barish me ambulance nahi aa sakti.", "Road me bade gadde hai, bus aana band ho gayi."],
          "en": ["The road to our village is completely broken; ambulances can't reach us in the rains.", "Huge potholes on the main road, the bus has stopped coming."]}),
        ("potholes", 5, "Potholes on the town road cause daily accidents for two-wheelers.",
         {"gu": ["શહેરના રસ્તા પર ખાડા છે, રોજ બાઇક સવારો પડે છે."], "hi": ["शहर की सड़क पर गड्ढे हैं, रोज़ बाइक वाले गिरते हैं।"],
          "hi-Latn": ["Sheher ki road pe gadde hai, roz bike wale girte hai."], "en": ["Potholes everywhere on the town road, two-wheeler riders fall daily."]}),
    ],
    "WATER": [
        ("no supply", 8, "No piped water for days; households depend on tankers and distant wells.",
         {"gu": ["અમારા વિસ્તારમાં ચાર દિવસથી પાણી આવ્યું નથી, ટેન્કર પર આધાર છે.", "નળમાં પાણી જ નથી આવતું, બહેનો બે કિલોમીટર દૂરથી પાણી લાવે છે."],
          "hi": ["हमारे इलाके में चार दिन से पानी नहीं आया, टैंकर पर निर्भर हैं।", "नल में पानी ही नहीं आता, महिलाएँ दो किलोमीटर दूर से पानी लाती हैं।"],
          "hi-Latn": ["Hamare area me 4 din se paani nahi aaya, tanker pe depend hai.", "Nal me paani hi nahi aata, aurate 2 km door se paani laati hai."],
          "en": ["No water supply in our area for four days, we depend on tankers.", "Taps are dry; women walk two kilometres for water."]}),
        ("contaminated water", 9, "Tap water is dirty and smells; children are falling sick with diarrhoea.",
         {"gu": ["નળનું પાણી ગંદું અને દુર્ગંધવાળું આવે છે, બાળકો બીમાર પડે છે."], "hi": ["नल का पानी गंदा और बदबूदार आता है, बच्चे बीमार पड़ रहे हैं।"],
          "hi-Latn": ["Nal ka paani ganda aur badbudar aata hai, bachche bimar pad rahe hai."], "en": ["Tap water is dirty and smells; kids are getting diarrhoea."]}),
        ("irregular supply", 5, "Water comes only for half an hour every alternate day at very low pressure.",
         {"gu": ["પાણી એક દિવસ છોડીને અડધો કલાક જ આવે છે, પ્રેશર પણ નથી."], "hi": ["पानी एक दिन छोड़कर आधा घंटा ही आता है, प्रेशर भी नहीं।"],
          "hi-Latn": ["Paani ek din chhod ke sirf aadha ghanta aata hai, pressure bhi nahi."], "en": ["Water comes for half an hour on alternate days, hardly any pressure."]}),
    ],
    "SANITATION": [
        ("blocked drain", 6, "Drains are blocked and sewage overflows into the street during rain.",
         {"gu": ["ગટર ભરાઈ ગઈ છે, વરસાદમાં ગંદુ પાણી શેરીમાં ફેલાય છે."], "hi": ["नाली जाम है, बारिश में गंदा पानी गली में भर जाता है।"],
          "hi-Latn": ["Naali jam hai, barish me ganda paani gali me bhar jata hai."], "en": ["Drains are blocked; sewage floods the street whenever it rains."]}),
        ("waterlogging", 7, "Low-lying colony gets waterlogged for days after rain; homes flooded.",
         {"gu": ["વરસાદ પછી અમારી સોસાયટીમાં દિવસો સુધી પાણી ભરાયેલું રહે છે."], "hi": ["बारिश के बाद हमारी कॉलोनी में कई दिन पानी भरा रहता है।"],
          "hi-Latn": ["Barish ke baad colony me kai din paani bhara rehta hai."], "en": ["Our colony stays waterlogged for days after rain, houses get flooded."]}),
    ],
    "WASTE": [("garbage not collected", 5, "Garbage has not been collected for over a week; heaps attract stray animals.",
               {"gu": ["અઠવાડિયાથી કચરો ઉપાડાયો નથી, ઢગલા પર કૂતરા-ગાય ફરે છે."], "hi": ["हफ्ते भर से कचरा नहीं उठा, ढेर पर आवारा जानवर आते हैं।"],
                "hi-Latn": ["Hafte bhar se kachra nahi utha, dher pe aawara janwar aate hai."], "en": ["Garbage not collected for a week; heaps are attracting stray animals."]})],
    "ELECTRICITY": [("power cuts", 6, "Power cuts of six to eight hours daily; students cannot study and pumps fail.",
                     {"gu": ["રોજ છ-આઠ કલાક લાઈટ જાય છે, બાળકો વાંચી શકતા નથી."], "hi": ["रोज़ छह-आठ घंटे बिजली जाती है, बच्चे पढ़ नहीं पाते।"],
                      "hi-Latn": ["Roz 6-8 ghante light jaati hai, bachche padh nahi paate."], "en": ["Six to eight hours of power cuts daily; children can't study, pumps don't run."]}),
                    ("transformer fault", 7, "Transformer burnt out two weeks ago and has not been replaced.",
                     {"gu": ["બે અઠવાડિયાથી ટ્રાન્સફોર્મર બળી ગયું છે, બદલાયું નથી."], "hi": ["दो हफ्ते से ट्रांसफार्मर जला हुआ है, बदला नहीं गया।"],
                      "hi-Latn": ["2 hafte se transformer jala hua hai, badla nahi."], "en": ["Transformer burnt out two weeks ago, still not replaced."]})],
    "STREETLIGHT": [("dark streets", 5, "Street lights have not worked for months; women feel unsafe after dark.",
                     {"gu": ["મહિનાઓથી સ્ટ્રીટ લાઈટ બંધ છે, રાત્રે બહેનોને ડર લાગે છે."], "hi": ["महीनों से स्ट्रीट लाइट बंद है, रात में महिलाओं को डर लगता है।"],
                      "hi-Latn": ["Mahino se street light band hai, raat me aurato ko dar lagta hai."], "en": ["Street lights dead for months; women feel unsafe at night."]})],
    "HEALTH": [
        ("no doctor", 9, "The PHC has had no doctor for months; pregnant women travel 40 km for care.",
         {"gu": ["PHC માં મહિનાઓથી ડોક્ટર નથી, સગર્ભા બહેનોને 40 કિમી દૂર જવું પડે છે.", "દવાખાનામાં ડોક્ટર જ નથી આવતા, દવા પણ મળતી નથી."],
          "hi": ["PHC में महीनों से डॉक्टर नहीं है, गर्भवती महिलाओं को 40 किमी जाना पड़ता है।", "अस्पताल में डॉक्टर ही नहीं आते, दवा भी नहीं मिलती।"],
          "hi-Latn": ["PHC me mahino se doctor nahi hai, pregnant aurato ko 40 km jaana padta hai.", "Hospital me doctor hi nahi aate, dawai bhi nahi milti."],
          "en": ["Our PHC has had no doctor for months; pregnant women travel 40 km.", "No doctor ever comes to the health centre, no medicines either."]}),
        ("no ambulance", 9, "No 108 ambulance reaches the village in time; patients are carried on cots.",
         {"gu": ["108 એમ્બ્યુલન્સ ગામ સુધી પહોંચતી નથી, દર્દીને ખાટલા પર લઈ જવા પડે છે."], "hi": ["108 एम्बुलेंस गाँव तक नहीं पहुँचती, मरीज़ को खाट पर ले जाना पड़ता है।"],
          "hi-Latn": ["108 ambulance gaon tak nahi pahunchti, patient ko khaat pe le jaana padta hai."], "en": ["The 108 ambulance never reaches our village; patients are carried on cots."]}),
    ],
    "EDUCATION": [("teacher shortage", 7, "Primary school has one teacher for five classes; children are dropping out.",
                   {"gu": ["પ્રાથમિક શાળામાં પાંચ ધોરણ માટે એક જ શિક્ષક છે, બાળકો ભણવાનું છોડી રહ્યા છે."], "hi": ["प्राथमिक स्कूल में पाँच कक्षाओं के लिए एक ही शिक्षक है, बच्चे पढ़ाई छोड़ रहे हैं।"],
                    "hi-Latn": ["Primary school me 5 class ke liye ek hi teacher hai, bachche school chhod rahe hai."], "en": ["One teacher for five classes at the primary school; kids are dropping out."]}),
                  ("unsafe building", 8, "School roof leaks and a wall has cracked; classes are held under a tree.",
                   {"gu": ["શાળાની છત ટપકે છે અને દીવાલમાં તિરાડ છે, ઝાડ નીચે ભણાવે છે."], "hi": ["स्कूल की छत टपकती है और दीवार में दरार है, पेड़ के नीचे पढ़ाई होती है।"],
                    "hi-Latn": ["School ki chhat tapakti hai aur deewar me crack hai, ped ke neeche padhai hoti hai."], "en": ["School roof leaks and a wall is cracked; classes happen under a tree."]})],
    "HOUSING": [("PMAY pending", 5, "PMAY house sanctioned two years ago but no instalment released; family lives in a kutcha hut.",
                 {"gu": ["બે વર્ષથી આવાસ મંજૂર છે પણ હપ્તો આવ્યો નથી, કાચા ઘરમાં રહીએ છીએ."], "hi": ["दो साल से आवास मंजूर है पर किस्त नहीं आई, कच्चे घर में रहते हैं।"],
                  "hi-Latn": ["2 saal se awas manzoor hai par kist nahi aayi, kachche ghar me rehte hai."], "en": ["PMAY house approved two years ago, no instalment yet; we live in a kutcha hut."]})],
    "ENVIRONMENT": [("air pollution", 7, "Factory smoke and dust make breathing difficult; children have asthma.",
                     {"gu": ["ફેક્ટરીના ધુમાડા અને ધૂળથી શ્વાસ લેવો મુશ્કેલ છે, બાળકોને દમ થયો છે."], "hi": ["फैक्ट्री के धुएँ और धूल से साँस लेना मुश्किल है, बच्चों को दमा हो गया है।"],
                      "hi-Latn": ["Factory ke dhuen aur dhool se saans lena mushkil hai, bachcho ko asthma ho gaya."], "en": ["Factory smoke and dust make it hard to breathe; kids have asthma."]}),
                    ("industrial effluent", 8, "Chemical effluent is released into the river; farm wells have turned red.",
                     {"gu": ["કેમિકલ પાણી નદીમાં છોડાય છે, ખેતરના કૂવા લાલ થઈ ગયા છે."], "hi": ["केमिकल का पानी नदी में छोड़ा जाता है, खेत के कुएँ लाल हो गए हैं।"],
                      "hi-Latn": ["Chemical ka paani nadi me chhoda jata hai, khet ke kuye laal ho gaye."], "en": ["Chemical effluent goes into the river; our farm wells have turned red."]})],
    "DISASTER": [("flooding", 8, "River floods the village every monsoon; no embankment or shelter.",
                  {"gu": ["દર ચોમાસે નદી ગામમાં ઘૂસે છે, ન પાળ છે ન આશ્રય."], "hi": ["हर मानसून में नदी गाँव में घुस आती है, न बाँध है न आश्रय।"],
                   "hi-Latn": ["Har monsoon me nadi gaon me ghus aati hai, na bandh hai na shelter."], "en": ["The river floods our village every monsoon; no embankment, no shelter."]})],
    "AGRI": [("irrigation", 6, "Canal water never reaches tail-end farms; crops fail every second year.",
              {"gu": ["કેનાલનું પાણી છેવાડાના ખેતર સુધી પહોંચતું નથી, પાક સુકાઈ જાય છે."], "hi": ["नहर का पानी आखिरी खेतों तक नहीं पहुँचता, फसल सूख जाती है।"],
               "hi-Latn": ["Nehar ka paani aakhri kheto tak nahi pahunchta, fasal sukh jaati hai."], "en": ["Canal water never reaches tail-end farms; crops dry up."]})],
    "CONNECTIVITY": [("no mobile network", 5, "No mobile signal in the village; online classes and DBT OTPs are impossible.",
                      {"gu": ["ગામમાં મોબાઈલ નેટવર્ક જ નથી, ઓનલાઈન ક્લાસ અને OTP આવતા નથી."], "hi": ["गाँव में मोबाइल नेटवर्क ही नहीं, ऑनलाइन क्लास और OTP नहीं आते।"],
                       "hi-Latn": ["Gaon me mobile network hi nahi, online class aur OTP nahi aate."], "en": ["No mobile signal in the village; online classes and bank OTPs don't work."]})],
    "WELFARE": [("pension not received", 6, "Widow pension has not been credited for four months.",
                 {"gu": ["ચાર મહિનાથી વિધવા પેન્શન જમા થયું નથી."], "hi": ["चार महीने से विधवा पेंशन जमा नहीं हुई।"],
                  "hi-Latn": ["4 mahine se vidhwa pension jama nahi hui."], "en": ["Widow pension not credited for four months."]}),
                ("ration card", 5, "Ration shop gives half quota and stays closed most days.",
                 {"gu": ["રેશનની દુકાન અડધું અનાજ આપે છે અને મોટાભાગે બંધ રહે છે."], "hi": ["राशन की दुकान आधा अनाज देती है और ज़्यादातर बंद रहती है।"],
                  "hi-Latn": ["Ration ki dukan aadha anaj deti hai aur zyada tar band rehti hai."], "en": ["Ration shop gives half the quota and is closed most days."]})],
    "EMPLOYMENT": [("MGNREGA wages", 6, "MGNREGA wages pending for three months; families are migrating for work.",
                    {"gu": ["ત્રણ મહિનાથી મનરેગાની મજૂરી મળી નથી, લોકો કામ માટે બહાર જાય છે."], "hi": ["तीन महीने से मनरेगा की मज़दूरी नहीं मिली, लोग काम के लिए पलायन कर रहे हैं।"],
                     "hi-Latn": ["3 mahine se MGNREGA ki majdoori nahi mili, log kaam ke liye bahar ja rahe hai."], "en": ["MGNREGA wages pending three months; families are migrating for work."]})],
    "PUBLIC_SPACE": [("playground", 3, "No playground or community hall; children play on the highway.",
                      {"gu": ["ગામમાં મેદાન કે સમાજ ભવન નથી, બાળકો હાઈવે પર રમે છે."], "hi": ["गाँव में मैदान या सामुदायिक भवन नहीं, बच्चे हाईवे पर खेलते हैं।"],
                       "hi-Latn": ["Gaon me maidan ya community hall nahi, bachche highway pe khelte hai."], "en": ["No playground or community hall; kids play on the highway."]})],
}

# ---- storylines: (district, category) → demand multiplier; growth = share of requests in the last 30 days ----------
STORY = {
    ("Dohad", "HEALTH"): (6.0, 0.25), ("Dohad", "ROADS"): (4.0, 0.2), ("The Dangs", "ROADS"): (5.0, 0.2), ("The Dangs", "CONNECTIVITY"): (3.0, 0.2),
    ("Narmada", "HEALTH"): (4.0, 0.2), ("Tapi", "HEALTH"): (2.5, 0.2), ("Vadodara", "EDUCATION"): (3.0, 0.2),
    ("Kachchh", "WATER"): (4.0, 0.2), ("Banas Kantha", "WATER"): (4.5, 0.2), ("Banas Kantha", "WATER"): (3.0, 0.2), ("Banas Kantha", "AGRI"): (2.5, 0.2),
    ("Surat", "WATER"): (3.5, 0.55), ("Surat", "SANITATION"): (2.5, 0.4), ("Ahmedabad", "ENVIRONMENT"): (3.0, 0.3), ("Ahmedabad", "WASTE"): (2.0, 0.2),
    ("Rajkot", "ENVIRONMENT"): (4.0, 0.3), ("Vadodara", "SANITATION"): (3.0, 0.45), ("Surendranagar", "WATER"): (2.5, 0.2),
    ("Amreli", "DISASTER"): (2.5, 0.3), ("Panch Mahals", "HEALTH"): (2.0, 0.2), ("Sabar Kantha", "ROADS"): (2.5, 0.2), ("Kheda", "SANITATION"): (2.0, 0.2),
    ("Gandhinagar", "ROADS"): (0.15, 0.2), ("Rajkot", "PUBLIC_SPACE"): (0.2, 0.2),
}
CATEGORY_BASE = {"ROADS": 1.6, "WATER": 1.7, "SANITATION": 1.0, "WASTE": 0.7, "ELECTRICITY": 1.0, "STREETLIGHT": 0.5, "HEALTH": 1.1, "EDUCATION": 0.7,
                 "HOUSING": 0.5, "ENVIRONMENT": 0.5, "DISASTER": 0.3, "AGRI": 0.7, "CONNECTIVITY": 0.4, "WELFARE": 0.8, "EMPLOYMENT": 0.5, "PUBLIC_SPACE": 0.3}
CHANNELS = [(Channel.WHATSAPP, 0.38), (Channel.WEB, 0.22), (Channel.VOICE, 0.15), (Channel.IVR, 0.1), (Channel.SMS, 0.1), (Channel.OFFICE, 0.05)]
LANG_MIX = [("gu", 0.55), ("hi", 0.2), ("hi-Latn", 0.15), ("en", 0.10)]


def pick(weighted):
    r, acc = rng.random(), 0.0
    for item, w in weighted:
        acc += w
        if r <= acc:
            return item
    return weighted[-1][0]


def main(n: int) -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        state = db.query(GeographicEntity).filter_by(level=GeoLevel.STATE, name=PILOT_STATE).one()
        districts = db.query(GeographicEntity).filter_by(parent_id=state.id, level=GeoLevel.DISTRICT).all()
        demo = {d.geo_id: d for d in db.query(Demographics)}

        # weights per (district, category)
        cells = []
        for g in districts:
            dm = demo[g.id]
            base = (dm.population ** 0.7) * (dm.mobile_penetration_pct / 100)
            for cat, cw in CATEGORY_BASE.items():
                mult, growth = STORY.get((g.name, cat), (rng.uniform(0.6, 1.3), 0.17))
                cells.append(((g, cat, growth), base * cw * mult))
        total = sum(w for _, w in cells)
        cells = [(c, w / total) for c, w in cells]

        # real Gemini embeddings for every issue template → cluster centroids
        issue_keys, issue_texts = [], []
        for cat, issues in T.items():
            for sub, urg, problem_en, _ in issues:
                issue_keys.append((cat, sub)); issue_texts.append(f"{cat}: {problem_en}")
        vectors = dict(zip(issue_keys, gemini_client.embed(issue_texts)))
        print(f"embedded {len(vectors)} issue templates with Gemini")

        clusters: dict[tuple[int, str, str], RequestCluster] = {}
        citizens = [f"+91{rng.randint(6000000000, 9999999999)}" for _ in range(int(n * 0.8))]
        created = 0
        for _ in range(n):
            (g, cat, growth) = pick(cells)
            sub, urg, problem_en, phr = rng.choice(T[cat])
            lang = pick(LANG_MIX)
            text = rng.choice(phr.get(lang) or phr["en"])
            days_ago = rng.uniform(0, 30) if rng.random() < growth else rng.uniform(30, 180)
            submitted = now - timedelta(days=days_ago, minutes=rng.randint(0, 1440))
            key = (g.id, cat, sub)
            cl = clusters.get(key)
            if cl is None:
                cl = RequestCluster(name=sub.capitalize(), category_code=cat, geo_id=g.id, representative_problem=problem_en, centroid=vectors[(cat, sub)])
                db.add(cl); db.flush(); clusters[key] = cl
            conf = round(rng.uniform(0.31, 0.59), 2) if rng.random() < 0.06 else round(0.60 + 0.39 * rng.random() ** 0.45, 2)
            req = CitizenRequest(
                tracking_code=new_tracking_code(), channel=pick(CHANNELS), original_text=text, declared_language=None if rng.random() < 0.5 else lang,
                citizen_hash=citizen_hash(rng.choice(citizens)), submitted_geo_id=g.id if rng.random() < 0.7 else None, submitted_at=submitted,
                detected_language=lang, translated_text=rng.choice(phr["en"]), category_code=cat, sub_category=sub, problem_description=problem_en,
                urgency_score=max(1, min(10, urg + rng.choice([-1, 0, 0, 0, 1]))), entities=[], ai_confidence=conf, ai_model="seed-template",
                resolved_geo_id=g.id, embedding=vectors[(cat, sub)], cluster_id=cl.id,
                processing_status=ProcessingStatus.PROCESSED if conf >= 0.6 else ProcessingStatus.REVIEW_REQUIRED,
                processing_error=None if conf >= 0.6 else f"low confidence {conf}", processed_at=submitted + timedelta(seconds=rng.randint(5, 90)),
            )
            db.add(req); created += 1
            if created % 500 == 0:
                db.flush(); print(f"  {created} requests")
        db.flush()

        # Link repeat reports the way the live pipeline does, so "one citizen reporting five times
        # is one citizen" is visible in the data and not merely asserted.
        linked = 0
        seen: dict[tuple, int] = {}
        for r in (db.query(CitizenRequest)
                  .filter(CitizenRequest.citizen_hash.isnot(None))
                  .order_by(CitizenRequest.cluster_id, CitizenRequest.submitted_at)):
            key = (r.cluster_id, r.citizen_hash)
            first = seen.get(key)
            if first is None:
                seen[key] = r.id
            else:
                r.duplicate_of_id = first
                linked += 1
        print(f"  linked {linked} repeat reports to an earlier one")

        for cl in clusters.values():
            refresh_cluster_stats(db, cl)
        db.commit()
        print(f"created {created} requests in {len(clusters)} clusters across {len(districts)} districts")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--n", type=int, default=3000)
    main(ap.parse_args().n)
