import csv
import json
import io

# Paste your CSV data here as a multi-line string
csv_data = """rank,seed,num_colors,mono_color,dual_osc_shapes,has_strobe,has_cycler,cycler_shapes,signature_shape_count,rarity_mode,rarity_score,rarity_index
1,pjhcrcus,1,cycler,12,Yes,Yes,18,14,colorfirst,1057.6500,96.2
2,suu6c1b0,1,cycler,13,No,Yes,18,14,colorfirst,1007.6500,91.6
3,9cceanug,1,white,6,Yes,No,0,15,colorfirst,851.9000,77.4
4,wixwvmlf,1,royal_blue,12,Yes,No,0,15,colorfirst,851.9000,77.4
5,tlsihij4,1,stacks_purple,15,Yes,No,0,15,colorfirst,851.9000,77.4
6,ydvbl2hg,1,gold,12,Yes,No,0,13,colorfirst,851.9000,77.4
7,payms5md,1,dark_red,9,Yes,No,0,15,colorfirst,850.9500,77.4
8,akop8lek,1,deep_purple,13,Yes,No,0,15,colorfirst,850.9500,77.4
9,hqs11nms,1,bright_pink,14,Yes,No,0,16,colorfirst,850.9500,77.4
10,mw8xfmyv,1,bright_pink,12,Yes,No,0,13,colorfirst,850.9500,77.4
11,68bmmo0w,1,bitcoin_orange,12,Yes,No,0,15,colorfirst,850.9500,77.4
12,ld6de2aa,1,bitcoin_orange,10,Yes,No,0,13,colorfirst,850.9500,77.4
13,u3r7zx6o,1,bright_yellow,12,Yes,No,0,15,colorfirst,850.9500,77.4
14,acp200h9,1,dark_green,12,Yes,No,0,15,colorfirst,850.9500,77.4
15,0je0vj7m,1,dark_green,12,Yes,No,0,14,colorfirst,850.9500,77.4
16,1zmjaxpp,1,deep_purple,12,Yes,No,0,16,colorfirst,850.9500,77.4
17,0d53spgn,1,bright_red,8,No,No,0,15,colorfirst,801.9000,72.9
18,inxpdbqm,1,dark_red,8,No,No,0,13,colorfirst,800.9500,72.8
19,zzomvgyc,1,bright_yellow,13,No,No,0,14,colorfirst,800.9500,72.8
20,e3pv5iak,3,,10,Yes,No,0,15,colorfirst,600.0000,54.5
21,uanb1cfw,3,,7,No,No,0,14,colorfirst,550.0000,50.0
22,j5xopsx9,4,,6,Yes,No,0,14,colorfirst,550.0000,50.0
23,4z9jatms,5,,11,Yes,Yes,2,17,colorfirst,505.2000,45.9
24,xf7yi5pr,5,,7,Yes,No,0,16,colorfirst,500.0000,45.5
25,y6dzk4r3,5,,5,Yes,No,0,15,colorfirst,500.0000,45.5
26,ap7z2awn,6,,8,Yes,Yes,2,15,colorfirst,455.2000,41.4
27,yh2a66qr,6,,8,Yes,Yes,2,15,colorfirst,455.2000,41.4
28,yrgbp0er,6,,8,Yes,No,0,13,colorfirst,450.0000,40.9
29,4jlksomw,6,,7,Yes,No,0,16,colorfirst,450.0000,40.9
30,u21rlxl0,6,,6,Yes,No,0,16,colorfirst,450.0000,40.9
31,p1teuavy,6,,10,Yes,No,0,14,colorfirst,450.0000,40.9
32,vycz18v6,6,,5,Yes,No,0,15,colorfirst,450.0000,40.9
33,7xpn101m,6,,6,No,Yes,2,14,colorfirst,405.2000,36.8
34,xxg8rhww,7,,5,Yes,Yes,2,15,colorfirst,405.2000,36.8
35,998dkb4b,7,,6,Yes,Yes,2,14,colorfirst,405.2000,36.8
36,x2xyn90z,7,,10,Yes,Yes,2,15,colorfirst,405.2000,36.8
37,icwpc2xu,7,,12,Yes,Yes,2,12,colorfirst,405.2000,36.8
38,vk5ua7r4,7,,6,Yes,Yes,1,12,colorfirst,405.1000,36.8
39,wn1ufh70,7,,5,Yes,Yes,1,15,colorfirst,405.1000,36.8
40,1h7xe2jo,7,,7,Yes,No,0,15,colorfirst,400.0000,36.4
41,xhujnanr,7,,4,Yes,No,0,14,colorfirst,400.0000,36.4
42,bxn3ovpm,7,,10,Yes,No,0,15,colorfirst,400.0000,36.4
43,gx3v5616,7,,10,Yes,No,0,17,colorfirst,400.0000,36.4
44,fgiqfybd,7,,6,Yes,No,0,15,colorfirst,400.0000,36.4
45,d9omvlur,7,,10,Yes,No,0,15,colorfirst,400.0000,36.4
46,cn3ba0pl,7,,13,Yes,No,0,16,colorfirst,400.0000,36.4
47,cklcun85,7,,10,Yes,No,0,14,colorfirst,400.0000,36.4
48,7ehstuli,7,,10,Yes,No,0,14,colorfirst,400.0000,36.4
49,5h8kfooe,7,,9,Yes,No,0,13,colorfirst,400.0000,36.4
50,x8wocjj0,7,,7,Yes,No,0,15,colorfirst,400.0000,36.4
51,zthk87oi,7,,3,Yes,No,0,15,colorfirst,400.0000,36.4
52,q2iqhw59,7,,12,Yes,No,0,14,colorfirst,400.0000,36.4
53,hy1z3tn3,7,,8,Yes,No,0,14,colorfirst,400.0000,36.4
54,fvdimabl,7,,11,Yes,No,0,17,colorfirst,400.0000,36.4
55,qn1n602r,7,,8,Yes,No,0,16,colorfirst,400.0000,36.4
56,h50q5dx8,7,,8,Yes,No,0,16,colorfirst,400.0000,36.4
57,ofigbnxm,7,,7,Yes,No,0,14,colorfirst,400.0000,36.4
58,sjn0l5y3,7,,10,Yes,No,0,15,colorfirst,400.0000,36.4
59,15h8y164,7,,8,No,Yes,3,16,colorfirst,355.3000,32.3
60,61j76xub,8,,10,Yes,Yes,3,14,colorfirst,355.3000,32.3
61,7r77lz4n,8,,11,Yes,Yes,3,16,colorfirst,355.3000,32.3
62,vaoo5zjr,8,,5,Yes,Yes,3,15,colorfirst,355.3000,32.3
63,a8mcifbp,8,,8,Yes,Yes,2,16,colorfirst,355.2000,32.3
64,nzicnl5r,8,,7,Yes,Yes,2,15,colorfirst,355.2000,32.3
65,w76ng4mt,8,,11,Yes,Yes,2,16,colorfirst,355.2000,32.3
66,1ktvpqiv,8,,9,Yes,Yes,2,16,colorfirst,355.2000,32.3
67,s38mycbg,8,,11,Yes,Yes,2,14,colorfirst,355.2000,32.3
68,v5ux9waz,7,,9,No,Yes,1,16,colorfirst,355.1000,32.3
69,7svghks4,7,,10,No,Yes,1,13,colorfirst,355.1000,32.3
70,2rzhkzwh,7,,6,No,Yes,1,14,colorfirst,355.1000,32.3
71,ykvxpjec,7,,10,No,Yes,1,16,colorfirst,355.1000,32.3
72,lmxiok75,8,,11,Yes,Yes,1,13,colorfirst,355.1000,32.3
73,i78iozsm,8,,7,Yes,Yes,1,12,colorfirst,355.1000,32.3
74,xnjy6exo,8,,5,Yes,Yes,1,16,colorfirst,355.1000,32.3
75,s1nsd4oi,8,,9,Yes,Yes,1,13,colorfirst,355.1000,32.3
76,y91qocj1,8,,8,Yes,Yes,1,14,colorfirst,355.1000,32.3
77,sfsjxfwr,8,,10,Yes,Yes,1,13,colorfirst,355.1000,32.3
78,xxfiyzhz,8,,8,Yes,Yes,1,14,colorfirst,355.1000,32.3
79,fzpq5gnl,8,,8,Yes,Yes,1,14,colorfirst,355.1000,32.3
80,shas9io8,8,,8,Yes,Yes,1,15,colorfirst,355.1000,32.3
81,x1e10p9j,7,,5,No,No,0,16,colorfirst,350.0000,31.8
82,yw3i3k36,8,,9,Yes,No,0,13,colorfirst,350.0000,31.8
83,3hritoqz,8,,9,Yes,No,0,14,colorfirst,350.0000,31.8
84,ud0qxdi6,8,,7,Yes,No,0,15,colorfirst,350.0000,31.8
85,1s7lo6lj,8,,9,Yes,No,0,16,colorfirst,350.0000,31.8
86,84ppfw2m,8,,7,Yes,No,0,15,colorfirst,350.0000,31.8
87,lo6zmoor,8,,10,Yes,No,0,14,colorfirst,350.0000,31.8
88,1lm1f48j,8,,6,Yes,No,0,15,colorfirst,350.0000,31.8
89,ghukro4c,8,,10,Yes,No,0,17,colorfirst,350.0000,31.8
90,2w30xkys,8,,6,Yes,No,0,15,colorfirst,350.0000,31.8
91,zjp990je,8,,11,Yes,No,0,15,colorfirst,350.0000,31.8
92,g44vik85,8,,9,Yes,No,0,14,colorfirst,350.0000,31.8
93,3volnbej,8,,9,Yes,No,0,14,colorfirst,350.0000,31.8
94,x65vzjll,8,,9,Yes,No,0,14,colorfirst,350.0000,31.8
95,mxyac6gf,8,,6,Yes,No,0,15,colorfirst,350.0000,31.8
96,nq2lsa1x,8,,7,No,Yes,4,15,colorfirst,305.4000,27.8
97,q029ds41,9,,5,Yes,Yes,3,16,colorfirst,305.3000,27.8
98,s8pzzo3w,9,,5,Yes,Yes,3,16,colorfirst,305.3000,27.8
99,twber7vx,9,,8,Yes,Yes,3,14,colorfirst,305.3000,27.8
100,6qnrrehp,9,,9,Yes,Yes,3,15,colorfirst,305.3000,27.8
101,t8o2glds,8,,5,No,Yes,2,15,colorfirst,305.2000,27.7
102,lt978luy,9,,11,Yes,Yes,2,13,colorfirst,305.2000,27.7
103,trzz4pug,9,,7,Yes,Yes,2,15,colorfirst,305.2000,27.7
104,3zfgt8la,9,,6,Yes,Yes,2,15,colorfirst,305.2000,27.7
105,dywkb8vu,9,,14,Yes,Yes,2,15,colorfirst,305.2000,27.7
106,msu6j5nm,9,,9,Yes,Yes,2,16,colorfirst,305.2000,27.7
107,k2s6hzcr,9,,7,Yes,Yes,2,16,colorfirst,305.2000,27.7
108,kdua0i8v,8,,10,No,Yes,1,12,colorfirst,305.1000,27.7
109,pd868avf,8,,9,No,Yes,1,14,colorfirst,305.1000,27.7
110,k7cqq142,9,,7,Yes,Yes,1,15,colorfirst,305.1000,27.7
111,qnyrq1q6,9,,5,Yes,Yes,1,14,colorfirst,305.1000,27.7
112,xads3wgb,9,,4,Yes,Yes,1,14,colorfirst,305.1000,27.7
113,ra17c49k,9,,8,Yes,Yes,1,13,colorfirst,305.1000,27.7
114,cvi78sgj,9,,6,Yes,Yes,1,13,colorfirst,305.1000,27.7
115,8jaw99rt,9,,7,Yes,Yes,1,15,colorfirst,305.1000,27.7
116,26ovq6q7,9,,6,Yes,Yes,1,14,colorfirst,305.1000,27.7
117,poptobs4,9,,8,Yes,Yes,1,17,colorfirst,305.1000,27.7
118,dx1mx4rk,9,,11,Yes,Yes,1,14,colorfirst,305.1000,27.7
119,cs9hoc2m,9,,9,Yes,Yes,1,15,colorfirst,305.1000,27.7
120,5xk9teid,9,,13,Yes,Yes,1,14,colorfirst,305.1000,27.7
121,d2vk5vqv,9,,9,Yes,Yes,1,15,colorfirst,305.1000,27.7
122,o493qph2,9,,6,Yes,Yes,1,15,colorfirst,305.1000,27.7
123,j0r2p222,9,,8,Yes,Yes,1,16,colorfirst,305.1000,27.7
124,y45qx3hg,9,,11,Yes,Yes,1,14,colorfirst,305.1000,27.7
125,yldgf9ea,8,,7,No,No,0,15,colorfirst,300.0000,27.3
126,e2407y5u,8,,9,No,No,0,15,colorfirst,300.0000,27.3
127,6943c0cp,8,,6,No,No,0,15,colorfirst,300.0000,27.3
128,2m0f5ix5,8,,10,No,No,0,13,colorfirst,300.0000,27.3
129,pppsbmqk,8,,9,No,No,0,13,colorfirst,300.0000,27.3
130,dzezu29b,9,,9,Yes,No,0,15,colorfirst,300.0000,27.3
131,qoalbdq3,9,,6,Yes,No,0,14,colorfirst,300.0000,27.3
132,1xmhq2je,9,,11,Yes,No,0,14,colorfirst,300.0000,27.3
133,jqwx6i35,9,,8,Yes,No,0,15,colorfirst,300.0000,27.3
134,f1xge2gv,9,,10,Yes,No,0,13,colorfirst,300.0000,27.3
135,vm3sz0sf,9,,8,Yes,No,0,15,colorfirst,300.0000,27.3
136,zfddilrl,9,,8,Yes,No,0,13,colorfirst,300.0000,27.3
137,hmsd37f1,9,,10,Yes,No,0,15,colorfirst,300.0000,27.3
138,oiccbavp,9,,7,Yes,No,0,15,colorfirst,300.0000,27.3
139,949pnymq,9,,9,Yes,No,0,13,colorfirst,300.0000,27.3
140,b4f6d7y2,9,,9,Yes,No,0,14,colorfirst,300.0000,27.3
141,umdclu3w,9,,6,Yes,No,0,13,colorfirst,300.0000,27.3
142,9pzonjrg,9,,8,Yes,No,0,16,colorfirst,300.0000,27.3
143,6fd8xal6,9,,9,Yes,No,0,14,colorfirst,300.0000,27.3
144,1c9ttn1p,9,,8,Yes,No,0,16,colorfirst,300.0000,27.3
145,um3h5ban,9,,6,Yes,No,0,16,colorfirst,300.0000,27.3
146,r1zjh6i5,9,,5,Yes,No,0,14,colorfirst,300.0000,27.3
147,ztx8clu1,9,,10,Yes,No,0,15,colorfirst,300.0000,27.3
148,7qppc65j,9,,9,Yes,No,0,16,colorfirst,300.0000,27.3
149,lhw892cq,9,,5,Yes,No,0,15,colorfirst,300.0000,27.3
150,8k7cq1eh,10,,10,Yes,Yes,3,13,colorfirst,255.3000,23.2
151,vptywtrq,10,,10,Yes,Yes,3,14,colorfirst,255.3000,23.2
152,9c9bemuq,10,,8,Yes,Yes,3,14,colorfirst,255.3000,23.2
153,4yty11om,10,,7,Yes,Yes,3,16,colorfirst,255.3000,23.2
154,0181pa78,9,,12,No,Yes,2,14,colorfirst,255.2000,23.2
155,wiy2i4qt,9,,10,No,Yes,2,13,colorfirst,255.2000,23.2
156,1j3d3dva,9,,11,No,Yes,2,13,colorfirst,255.2000,23.2
157,xfq17mbp,10,,9,Yes,Yes,2,14,colorfirst,255.2000,23.2
158,qtndyi84,9,,9,No,Yes,1,16,colorfirst,255.1000,23.2
159,gctuq8tf,9,,6,No,Yes,1,16,colorfirst,255.1000,23.2
160,a29jfzbo,9,,11,No,Yes,1,13,colorfirst,255.1000,23.2
161,w4wpzm90,9,,5,No,Yes,1,14,colorfirst,255.1000,23.2
162,a2p33tss,9,,9,No,Yes,1,14,colorfirst,255.1000,23.2
163,ipaxatz7,10,,9,Yes,Yes,1,15,colorfirst,255.1000,23.2
164,46kya1hb,10,,5,Yes,Yes,1,14,colorfirst,255.1000,23.2
165,5kf3hsl7,10,,11,Yes,Yes,1,15,colorfirst,255.1000,23.2
166,1yj10yoa,10,,7,Yes,Yes,1,16,colorfirst,255.1000,23.2
167,1b30svj1,10,,2,Yes,Yes,1,15,colorfirst,255.1000,23.2
168,3n4v3lta,10,,6,Yes,Yes,1,14,colorfirst,255.1000,23.2
169,pm685lnp,10,,7,Yes,Yes,1,15,colorfirst,255.1000,23.2
170,j8la784e,10,,8,Yes,Yes,1,15,colorfirst,255.1000,23.2
171,6plbbkyz,10,,8,Yes,Yes,1,15,colorfirst,255.1000,23.2
172,h54jyr6y,10,,6,Yes,Yes,1,14,colorfirst,255.1000,23.2
173,7uf3kl44,10,,9,Yes,Yes,1,14,colorfirst,255.1000,23.2
174,pu270g8t,10,,5,Yes,Yes,1,15,colorfirst,255.1000,23.2
175,nz59p5sn,10,,9,Yes,Yes,1,14,colorfirst,255.1000,23.2
176,j80lzzwq,10,,8,Yes,Yes,1,14,colorfirst,255.1000,23.2
177,5hrdxfqr,10,,7,Yes,Yes,1,16,colorfirst,255.1000,23.2
178,ki9wgiyg,10,,12,Yes,Yes,1,14,colorfirst,255.1000,23.2
179,10ksyxe8,10,,7,Yes,Yes,1,14,colorfirst,255.1000,23.2
180,e9xs74po,10,,9,Yes,Yes,1,16,colorfirst,255.1000,23.2
181,a98dzxp4,10,,9,Yes,Yes,1,14,colorfirst,255.1000,23.2
182,notfwt98,10,,12,Yes,Yes,1,14,colorfirst,255.1000,23.2
183,0hdq52f2,10,,8,Yes,Yes,1,14,colorfirst,255.1000,23.2
184,4mmug9re,10,,7,Yes,Yes,1,15,colorfirst,255.1000,23.2
185,jrv8zmrp,10,,8,Yes,Yes,1,16,colorfirst,255.1000,23.2
186,dhqvmsxy,9,,7,No,No,0,15,colorfirst,250.0000,22.7
187,8gw9662g,9,,6,No,No,0,14,colorfirst,250.0000,22.7
188,yielphyp,9,,6,No,No,0,16,colorfirst,250.0000,22.7
189,kv2i4n1x,9,,6,No,No,0,14,colorfirst,250.0000,22.7
190,9iu1mav4,9,,7,No,No,0,16,colorfirst,250.0000,22.7
191,gwmaegt1,9,,9,No,No,0,15,colorfirst,250.0000,22.7
192,q4javypc,10,,10,Yes,No,0,14,colorfirst,250.0000,22.7
193,8z0a02rg,10,,3,Yes,No,0,15,colorfirst,250.0000,22.7
194,intj0qd2,10,,9,Yes,No,0,15,colorfirst,250.0000,22.7
195,sscjba2b,10,,7,Yes,No,0,13,colorfirst,250.0000,22.7
196,6mty6v6d,10,,11,Yes,No,0,15,colorfirst,250.0000,22.7
197,evjcxnpi,10,,6,Yes,No,0,16,colorfirst,250.0000,22.7
198,r8yd9bf3,10,,8,Yes,No,0,15,colorfirst,250.0000,22.7
199,f0ejdnib,10,,7,Yes,No,0,14,colorfirst,250.0000,22.7
200,43xewl46,10,,7,Yes,No,0,13,colorfirst,250.0000,22.7
201,hnsnhys6,10,,5,Yes,No,0,13,colorfirst,250.0000,22.7
202,9n43uoht,10,,7,Yes,No,0,14,colorfirst,250.0000,22.7
203,jzliibsy,10,,7,Yes,No,0,17,colorfirst,250.0000,22.7
204,538ca66c,10,,10,Yes,No,0,13,colorfirst,250.0000,22.7
205,cj9axu3d,10,,8,Yes,No,0,14,colorfirst,250.0000,22.7
206,302hphv5,10,,6,Yes,No,0,13,colorfirst,250.0000,22.7
207,rjbre3yq,10,,12,Yes,No,0,15,colorfirst,250.0000,22.7
208,w5z63ysk,10,,7,Yes,No,0,15,colorfirst,250.0000,22.7
209,wb57oxjw,10,,9,Yes,No,0,14,colorfirst,250.0000,22.7
210,277h7mu5,10,,8,Yes,No,0,15,colorfirst,250.0000,22.7
211,x22xtx7p,10,,8,Yes,No,0,15,colorfirst,250.0000,22.7
212,fgarg5dz,10,,7,No,Yes,3,15,colorfirst,205.3000,18.7
213,qkuh3p2f,10,,13,No,Yes,3,15,colorfirst,205.3000,18.7
214,6ghrbh0u,11,,9,Yes,Yes,3,13,colorfirst,205.3000,18.7
215,or4033kf,10,,11,No,Yes,2,15,colorfirst,205.2000,18.7
216,yvcnnjnh,10,,7,No,Yes,2,15,colorfirst,205.2000,18.7
217,q6v07l60,10,,8,No,Yes,2,15,colorfirst,205.2000,18.7
218,ckls8lj8,11,,6,Yes,Yes,2,13,colorfirst,205.2000,18.7
219,d10hnaq9,11,,4,Yes,Yes,2,14,colorfirst,205.2000,18.7
220,jjv69l3z,11,,5,Yes,Yes,2,15,colorfirst,205.2000,18.7
221,zwaex941,10,,6,No,Yes,1,13,colorfirst,205.1000,18.6
222,11stbur9,11,,9,Yes,Yes,1,16,colorfirst,205.1000,18.6
223,p08sc26a,11,,9,Yes,Yes,1,15,colorfirst,205.1000,18.6
224,nveffipi,11,,10,Yes,Yes,1,16,colorfirst,205.1000,18.6
225,scy4b424,11,,11,Yes,Yes,1,15,colorfirst,205.1000,18.6
226,os3dk9ac,11,,10,Yes,Yes,1,16,colorfirst,205.1000,18.6
227,7mlq8000,11,,6,Yes,Yes,1,15,colorfirst,205.1000,18.6
228,h1qigpd2,11,,10,Yes,Yes,1,13,colorfirst,205.1000,18.6
229,0rduzjr3,11,,6,Yes,Yes,1,14,colorfirst,205.1000,18.6
230,q5jrx9fu,11,,9,Yes,Yes,1,14,colorfirst,205.1000,18.6
231,z2f6xy21,11,,12,Yes,Yes,1,13,colorfirst,205.1000,18.6
232,y7qvhmc1,11,,5,Yes,Yes,1,15,colorfirst,205.1000,18.6
233,udb7uc6d,11,,8,Yes,Yes,1,15,colorfirst,205.1000,18.6
234,jz5jhgzt,10,,11,No,No,0,15,colorfirst,200.0000,18.2
235,40nb9k7x,10,,11,No,No,0,15,colorfirst,200.0000,18.2
236,bw7xmkp7,10,,6,No,No,0,13,colorfirst,200.0000,18.2
237,0rwpeq7h,10,,9,No,No,0,13,colorfirst,200.0000,18.2
238,c6tx27k8,10,,9,No,No,0,15,colorfirst,200.0000,18.2
239,no4l9avb,11,,8,Yes,No,0,16,colorfirst,200.0000,18.2
240,hqutptbr,11,,8,Yes,No,0,14,colorfirst,200.0000,18.2
241,88kvmm45,11,,9,Yes,No,0,14,colorfirst,200.0000,18.2
242,jb69lhm2,11,,9,Yes,No,0,16,colorfirst,200.0000,18.2
243,x9i2gr0g,11,,9,Yes,No,0,14,colorfirst,200.0000,18.2
244,qmwe1s75,11,,8,No,Yes,1,14,colorfirst,155.1000,14.1
245,ripx4y5d,11,,10,No,Yes,1,14,colorfirst,155.1000,14.1
246,qlnlxvha,11,,10,No,Yes,1,14,colorfirst,155.1000,14.1
247,tvuptn0p,12,,10,Yes,Yes,1,12,colorfirst,155.1000,14.1
248,ff0l359a,12,,12,Yes,Yes,1,16,colorfirst,155.1000,14.1
249,1gaih0b4,12,,7,Yes,Yes,1,15,colorfirst,155.1000,14.1
250,nk3o4k8f,12,,9,Yes,Yes,1,13,colorfirst,155.1000,14.1
251,szcvz4bc,13,,6,Yes,Yes,1,17,colorfirst,155.1000,14.1
252,1nsis5l2,11,,8,No,No,0,14,colorfirst,150.0000,13.6
253,zjfwqt32,13,,7,Yes,No,0,15,colorfirst,150.0000,13.6
254,vhe6dcth,12,,8,No,Yes,2,12,colorfirst,105.2000,9.6
255,fo8tkqt4,12,,12,No,Yes,2,16,colorfirst,105.2000,9.6
256,yknygwc0,12,,11,No,Yes,1,14,colorfirst,105.1000,9.6
"""

# The base inscription ID string
base_inscription_id = "6d009a241ce7f6a1b3b738fd8837bd2937daee9eda72b604b7586f9dc292b101"

# Use io.StringIO to treat the string data as a file
csv_file = io.StringIO(csv_data)

# Use DictReader to easily access columns by name
reader = csv.DictReader(csv_file)

# List to hold the final JSON objects
nft_collection = []

# Process each row in the CSV
for row in reader:
    # Get the rank and calculate the zero-based index for name and ID
    rank = int(row['rank'])
    item_index = rank - 1

    # Construct the full inscription ID
    full_inscription_id = f"{base_inscription_id}i{item_index}"

    # Create the list of attributes, excluding 'rank' and 'seed' from being traits
    attributes = []
    for trait_type, value in row.items():
        if trait_type not in ['rank', 'seed']:
            attributes.append({
                "trait_type": trait_type,
                "value": value if value else "None" # Handle empty values
            })

    # Create the final JSON object for this NFT
    nft_item = {
        "id": full_inscription_id,
        "meta": {
            "name": f"Gnarl #{item_index}",
            "attributes": attributes
        }
    }
    nft_collection.append(nft_item)

# Convert the list to a JSON string with indentation for readability
json_output = json.dumps(nft_collection, indent=2)

# Print the final JSON
print(json_output)

# To save the output to a file, you can uncomment these lines:
with open('gnarl_collection.json', 'w') as f:
    f.write(json_output)
print("Successfully saved to gnarl_collection.json")

### Generated JSON Output (Snippet)

