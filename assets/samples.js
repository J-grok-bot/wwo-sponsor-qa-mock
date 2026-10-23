// ALL DATA BELOW IS FICTIONAL EXAMPLE DATA for the demo. Sponsors, shows, hosts, promo codes and URLs are invented
// and do not represent Westwood One, its clients, or any real podcast. URLs use the reserved ".example" domain.
window.SAMPLES = {
  web: {
    label: "Package 1 · Week of Nov 2, 2026",
    scripts: `R1 | S1 | MF | :60
Mornings are rough when you slept on a lumpy mattress. Nimbus Mattress is cooling, supportive, and ridiculously comfortible. Try it for one hundred nights at home. Go to https://nimbusmattress.example/fog and use code FOG20 for twenty percent off your order.

R2 | S2 | GS | :60
Every project in my garage starts with a cup of coffee. BrewCrate Coffee ships small-batch beans roasted the week you order them. Honestly, I could of switched years ago. Head to https://brewcrate.example/garage and enter code GARAGE20 for fifteen percent off your first box.

R3 | S3 | LL | :30
Small business taxes do not have to keep you up at night. LedgerLite Accounting sorts your receipts and files your quarterly estimates automatically. It has been a game-changer for freelancers. Visit https://ledgerlite.example/ledgr and use code LEDGER30 for thirty percent off.

R4 | S4 | MF | :30
TrailPaws Dog Food is made with real salmon and sweet potato. I personally feed it to my dog every single morning. Visit https://trailpaws.example/garage and use code FOG20 to get your first bag half off.

R5 | S4 | GS | :30
If your dog is the the real boss of your workshop, feed them TrailPaws Dog Food. Real salmon, no fillers. Visit https://trailpaw.example/garage and use code FOG20 to get your first bag half off.

R6 | S5 | LL | :60
Paying too much for your phone plan? Sparkline Mobile gives you unlimitted talk, text, and data on a nationwide network for less. Switch in minutes and keep your number. Go to htps://sparkline.example/podcast and use code SPARK10 for ten dollars off every month.`,
    sponsors: `sponsor_id,sponsor,flight_start,flight_end,approved_shows
S1,Nimbus Mattress,2026-11-02,2026-11-06,MF
S2,BrewCrate Coffee,2026-11-02,2026-11-06,GS
S3,LedgerLite Accounting,2026-11-04,2026-11-06,LL
S4,TrailPaws Dog Food,2026-11-02,2026-11-06,MF|GS
S5,Sparkline Mobile,2026-11-02,2026-11-06,LL`,
    codes: `sponsor_id,promo_code
S1,FOG20
S2,GARAGE15
S3,LEDGER30
S4,FOG20
S5,SPARK10`,
    links: `sponsor_id,url
S1,https://nimbusmattress.example/fog
S2,https://brewcrate.example/garage
S3,https://ledgerlite.example/ledger
S4,https://trailpaws.example/garage
S5,https://sparkline.example/podcast`,
    schedule: `date,day,show_id,slot,read_id
2026-11-02,Mon,MF,pre,R1
2026-11-02,Mon,MF,mid,R4
2026-11-02,Mon,GS,pre,R2
2026-11-02,Mon,GS,mid,R5
2026-11-02,Mon,LL,pre,R6
2026-11-02,Mon,LL,mid,R3
2026-11-03,Tue,MF,mid,R1
2026-11-03,Tue,MF,mid,R4
2026-11-03,Tue,GS,pre,R2
2026-11-03,Tue,LL,pre,R6
2026-11-04,Wed,MF,pre,R1
2026-11-04,Wed,GS,pre,R5
2026-11-04,Wed,GS,mid,R2
2026-11-04,Wed,LL,pre,R3
2026-11-04,Wed,LL,mid,R6
2026-11-05,Thu,MF,pre,R4
2026-11-05,Thu,MF,mid,R1
2026-11-05,Thu,LL,pre,R3
2026-11-06,Fri,MF,pre,R1
2026-11-06,Fri,GS,pre,R2
2026-11-06,Fri,LL,pre,R3
2026-11-06,Fri,LL,mid,R2`,
    hosts: `show_id,show,host,do_not_say
MF,The Morning Fog,Dana Reyes,I personally; best on the market; guaranteed
GS,Garage Science,Milo Tran,life-changing; no-brainer
LL,Late Ledger,Priya Okafor,game-changer; risk-free; you'd be crazy not to`
  },
  email: {
    label: "Package 2 · Week of Nov 9, 2026",
    from: "Traffic Desk <traffic@example-agency.test>", fromAddr: "traffic@example-agency.test",
    subject: "[EXAMPLE] Sponsor package - week of Nov 9, 2026",
    received: "Fri, Nov 6, 2026, 2:05 PM ET",
    body: "Hi team, attached is next week's package: scripts, sponsor sheet, promo codes, links, schedule, and host preferences. Thanks!",
    scripts: `R1 | S1 | MF | :60
Dinner should not be a nightly puzzle. Cobalt Meal Kits delivers fresh ingredients and simple recipes right to your door. Visit https://cobaltmeals.example/fog and use code SAVE20 for twenty dollars off your first box.

R2 | S2 | GS | :30
Juniper Fitness builds a workout plan around your real schedule. I should of started years ago, and the coaches actually answer questions. Go to https://juniperfit.example/garage and use code SAVE20 to get your first month free.

R3 | S3 | LL | :60
Planning a trip should feel exciting, not stressful. Kiteline Travel finds flights and hotels in one search and tracks prices for you. Visit https://kiteline.example/ledger and use code KITE25 for fifteen percent off your first booking.

R4 | S4 | MF | :30
Oakline Socks are made from soft merino wool that stays warm and dry all day. Order this week and you will recieve a free pair with your first pack. Visit https://oaklinesocks.example/fog and use code OAK10 for ten percent off.

R5 | S5 | LL | :30
Pebble Budget takes the guesswork out of your monthly spending. It is completely risk-free to try for thirty days. Head to https://pebblebudget.example/fog and use code PEBBLE30 for thirty percent off a yearly plan.

R6 | S4 | GS | :30
Cold feet in the workshop? Oakline Socks keep your toes warm through every project. Visit https://oaklinesocks.example/shop and use code OAK10 for ten percent off.`,
    sponsors: `sponsor_id,sponsor,flight_start,flight_end,approved_shows
S1,Cobalt Meal Kits,2026-11-09,2026-11-13,MF
S2,Juniper Fitness,2026-11-09,2026-11-13,GS
S3,Kiteline Travel,2026-11-09,2026-11-11,LL
S4,Oakline Socks,2026-11-09,2026-11-13,MF|GS
S5,Pebble Budget,2026-11-09,2026-11-13,LL`,
    codes: `sponsor_id,promo_code
S1,SAVE20
S2,SAVE20
S3,KITE15
S4,OAK10
S5,PEBBLE30`,
    links: `sponsor_id,url
S1,https://cobaltmeals.example/fog
S2,https://juniperfit.example/garage
S3,https://kiteline.example/ledger
S4,https://oaklinesocks.example/shop
S5,https://pebblebudget.example/fog`,
    schedule: `date,day,show_id,slot,read_id
2026-11-09,Mon,MF,pre,R1
2026-11-09,Mon,GS,pre,R2
2026-11-09,Mon,LL,pre,R3
2026-11-10,Tue,MF,pre,R4
2026-11-10,Tue,GS,pre,R6
2026-11-10,Tue,LL,pre,R5
2026-11-11,Wed,MF,pre,R1
2026-11-11,Wed,GS,pre,R2
2026-11-11,Wed,LL,pre,R3
2026-11-12,Thu,MF,pre,R4
2026-11-12,Thu,GS,pre,R6
2026-11-12,Thu,LL,pre,R3
2026-11-13,Fri,MF,pre,R1
2026-11-13,Fri,GS,pre,R2
2026-11-13,Fri,LL,pre,R5`,
    hosts: `show_id,show,host,do_not_say
MF,The Morning Fog,Dana Reyes,I personally; best on the market; guaranteed
GS,Garage Science,Milo Tran,life-changing; no-brainer
LL,Late Ledger,Priya Okafor,game-changer; risk-free; you'd be crazy not to`
  },
  // Mock HTTP results (the .example URLs are fictional, so no real requests are made in this demo).
  linkStatus: {
    "https://nimbusmattress.example/fog": 200, "https://brewcrate.example/garage": 200, "https://ledgerlite.example/ledger": 200,
    "https://ledgerlite.example/ledgr": 404, "https://trailpaws.example/garage": 200, "https://trailpaw.example/garage": "DNS_FAIL",
    "https://sparkline.example/podcast": 200,
    "https://cobaltmeals.example/fog": 200, "https://juniperfit.example/garage": 200, "https://kiteline.example/ledger": 200,
    "https://oaklinesocks.example/fog": 404, "https://oaklinesocks.example/shop": 200, "https://pebblebudget.example/fog": 200
  },
  dictionary: ["nimbus", "brewcrate", "ledgerlite", "trailpaws", "sparkline", "freelancers", "fillers", "kiteline", "oakline", "merino"]
};
