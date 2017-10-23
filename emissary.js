//
// Emissary
// Copyright (C) 2015 Moe Alam, moeiscool
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// # Donate
//
// If you like what I am doing here and want me to continue please consider donating :)
// PayPal : paypal@m03.ca
//
process.on('uncaughtException', function (err) {
    console.error('uncaughtException',err);
});
s={ver:'Emissary 0.1',s:JSON.stringify},s.visitors={},s.a={},s.p={},s.onlineOperators={},s.c={},s.ci={},s.nf={},s.dp={},s.ban={},s.channels={},s.cv={};

var http=require('http'),
    https=require('https'),
    nodemailer = require('nodemailer'),
    request = require('request'),
    express = require('express'),
    mysql=require('mysql'),
    moment=require('moment'),
    fs=require('fs'),
    exec=require('child_process').exec,
    PeerServer=require('peer').ExpressPeerServer,
    freegeoip=require('node-freegeoip'),
    redis=require('redis'),
    crypto=require('crypto'),
    app = express(),
    bodyParser=require("body-parser"),
    server = http.createServer(app),
    io = require('socket.io')(server),
    config=require('./conf.json'),
    sql;
if(config.mail){
    var nodemailer = require('nodemailer').createTransport(config.mail);
}
if(config.title===undefined){config.title='Emissary'}
if(config.port===undefined){config.port=80}
if(config.ip===undefined||config.ip===''||config.ip.indexOf('0.0.0.0')>-1){config.ip='localhost'}else{config.bindip=config.ip};
if(config.peerJS===undefined){config.peerJS=true}
//
s.cloneObject=function(obj) {
    return JSON.parse(JSON.stringify(obj))
}
s.objectCount=function(obj) {
    return Object.values(obj).length
}
s.validateEmail=function(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}
//connect redis
s.redis=function(){
    red=redis.createClient();
    red.on("error",function(d){
        setTimeout(function(){console.log('Error : Redis, Reconnecting');s.redis()},5000)
    })
}
s.redis();
//check relative path
s.checkRelativePath=function(x){
    if(x.charAt(0)!=='/'){
        x=__dirname+'/'+x
    }
    return x
}
//cloudflare client ip
s.getClientIPthroughCloudFlare=function(req){
    var ip = req.headers["'x-forwarded-for"]||(req.connection.remoteAddress ? req.connection.remoteAddress : req.remoteAddress);
    if (typeof req.headers['cf-connecting-ip']==='string'){
        ip=req.headers['cf-connecting-ip'];
    }
    return ip
}

//json parse
s.jp=function(d,x){if(!d||d==""||d=="null"){if(x){d=x}else{d={}}};try{d=JSON.parse(d)}catch(er){if(x){d=x}else{d={}}};return d;}
//json string
s.js=function(d){d=JSON.stringify(d);if(d=="null"){d=null;};return d;}
//md5 tag
s.md5=function(x){return crypto.createHash('md5').update(x).digest("hex");}
//random tag
s.gid=function(x){
    if(!x){x=10};var t = "";var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < x; i++ )
        t += p.charAt(Math.floor(Math.random() * p.length));
    return t;
};
s.isJson=function(x){
    try{JSON.parse(x);if(!x){return false}}catch(er){return false}
    return true;
}
//redis set value
s.stt=function(x,y){if(!y||y=="null"){return false;};red.set(x,y)};
//sql config
s.disc=function(){
    sql = mysql.createConnection(config.db); 
    sql.connect(function(err) {if(err){console.log('Error Connecting : DB',err);setTimeout(s.disc, 2000);}});
    sql.on('error',function(err) {console.log('DB Lost.. Retrying..');console.log(err);s.disc();return;});
}
s.disc();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('views', __dirname + '/web/pages');
app.set('view engine','ejs');
app.use('/libs',express.static(__dirname + '/web/libs'));
app.use('/peerjs',PeerServer(server));
server.listen(config.port,config.bindip,function(){
    console.log('Emissary - PORT : '+config.port);
});
//SSL options
if(config.ssl&&config.ssl.key&&config.ssl.cert){
    config.ssl.key=fs.readFileSync(s.checkRelativePath(config.ssl.key),'utf8')
    config.ssl.cert=fs.readFileSync(s.checkRelativePath(config.ssl.cert),'utf8')
    if(config.ssl.port===undefined){
        config.ssl.port=443
    }
    if(config.ssl.bindip===undefined){
        config.ssl.bindip=config.bindip
    }
    if(config.ssl.ca&&config.ssl.ca instanceof Array){
        config.ssl.ca.forEach(function(v,n){
            config.ssl.ca[n]=fs.readFileSync(s.checkRelativePath(v),'utf8')
        })
    }
    var serverHTTPS = https.createServer(config.ssl,app);
    serverHTTPS.listen(config.ssl.port,config.bindip,function(){
        console.log('SSL Emissary - SSL PORT : '+config.ssl.port);
    });
    io.attach(serverHTTPS);
    app.use('/peerjs',PeerServer(serverHTTPS));
}
//log to redis
s.log=function(x,xx,xxx,tt,ti){
    if(!xxx){tt="LOG_"+x}else{tt="LOG_"+x+"_"+xxx};ti=s.moment();
    red.get(tt,function(err,rd){rd=s.jp(rd,[]);
        if(rd.length>49){rd.shift()};rd.push({d:xx,t:ti});s.stt(tt,s.js(rd));
    });xx.time=ti;
    if(xxx){atx({ulog:xx,bid:xxx,uid:x},x)}
}
s.moment=function(e){if(!e){e=new Date};return moment(e).utcOffset('-0800').format('YYYY-MM-DD HH:mm:ss')}
s.lr=function(h){try{return Object.keys(io.sockets.adapter.rooms[h])}catch(e){return []}};s.gs=function(h){return io.sockets.connected[h]};
//Count Admins
s.ca=function(gt){
    if(s.onlineOperators[gt]){return Object.keys(s.onlineOperators[gt]).length+1}else{return 1}
}
//admin object for client side
s.ad=function(u,v){
    return {n:u.n,bid:u.bid,ip:u.ip,pp:u.pp,u:u.uid,c:v,peer:u.peer,status:u.status};
}
//Get admin details
s.cd=function(gt,e){
    if(s.onlineOperators[gt]){
        e={e:{}};
        Object.keys(s.onlineOperators[gt]).forEach(function(v){
            e.u=s.onlineOperators[gt][v].u;
            if(s.a[e.u]&&s.a[e.u][v]){
                e.e[v]=s.ad(s.a[e.u][v],v);
            }
        })
        return e.e;
    }
}
//Server Sender
s.tx=function(z,y,x){
    if(x){return x.broadcast.to(y).emit('ret',z)}
        io.to(y).emit('ret',z);
}
function ex(z,y){//forEach Sender
    (y).forEach(function(v){
        io.to(v).emit('ret',z);
    })
}
function atx(z,x,u){//Admin Sender
    if(u){return u.broadcast.to('1AA_A_'+x).emit('ret',z)};io.to('1AA_A_'+x).emit('ret',z);
}
function aatx(z,x,y){//send to both vis and admins
    s.tx(z,x,y);atx(z,x,y)
}
//get geo data for ip
s.geo=function(z,y,x){
    if(freegeoip){
        freegeoip.getLocation(z, function(err,loc) {
         if(loc){
             if(loc.country_code==='IL'){
                 loc.country_code='PS'
                 loc.country_name='Palestine'
             }
            loc.flag=loc.country_code.toLowerCase()
            s.visitors[x][y].geo=loc
            atx({geo:loc,bid:y,uid:x},x)
         }
        });
    }
}
//visitor checker
s.stf=function(x,y,z,srun){
    y.default={sc:"d",ry:"d",dp:"d"};
    //check if banned
    srun=function(rd){
        y.t=false;if(!rd){rd=[''];};if(!rd[0]||typeof rd[0]!=='string'){rd[0]='';};
        rd[0].split(',').forEach(function(v){
            if(y.ip==v){y.t=true}
        })
        if(y.t==true){z({banned:1,script:rd[1]});y.cn();}else{
            //not a banned IP
            srun=function(rd){
//                y.t=false;
//                rd.split(',').forEach(function(v){
//                    if(y.trust.indexOf(v.toLowerCase())>-1){y.t=true}
//                })
//                if(y.t==false){
//                    //not trusted domain
//                    z({trust:0});y.cn();
//                }else{
                    //trusted domain, do gets
                    red.get("RAT_K_"+x,function(err,key){//rating
                        red.get("DEP_K_"+x,function(err,key2){//department
                            red.get("STY_K_"+x,function(err,key3){//style
                                if(!key||key!==y.ry||!key2||key2!==y.dp||!key3||key3!==y.sc){//check all
                                    sql.query('SELECT ids,ops FROM Users WHERE ke=?',[x],function(er,r){
                                    sql.query('SELECT rates,depts FROM Details WHERE ke=?',[x],function(er,rr){
                                            if(r&&r[0]&&rr&&rr[0]){
                                                r=r[0];try{r.ids=JSON.parse(r.ids);}catch(er){r.ids=y.default};
                                                s.stt("RAT_K_"+x,r.ids.ry),s.stt("DEP_K_"+x,r.ids.dp),s.stt("STY_K_"+x,r.ids.sc);
                                                z({rates:rr[0].rates,sc:r.ids.ry});
                                                z({depts:rr[0].depts,sc:r.ids.dp});
                                                z({bg:r.ops,sc:r.ids.sc});
                                            }
                                        });
                                    });
                                }
                            });
                        });
                    });
//                }
            }
            red.get("TRUST_"+x,function(err,rd){
                if(!rd){
                    sql.query('SELECT ids FROM Users WHERE ke=?',[x],function(er,r){
                        if(r&&r[0]){r=s.jp(r[0].ids).trusted;s.stt("TRUST_"+x,r);srun(r);}
                    });
                }else{
                    srun(rd)
                }
            });
            //
        }
    }
    red.get("BANNED_"+x,function(err,rd){
        if(!rd){
            sql.query('SELECT ids FROM Users WHERE ke=?',[x],function(er,r){
                if(r&&r[0]){r=s.jp(r[0].ids);er=r.bannedf;r=r.banned;if(!r||r=="null"){r='';};srun([r,er]);}
                s.stt("BANNED_"+x,JSON.stringify([r,er]));
            });
        }else{
            srun(s.jp(rd))
        }
    });
}
s.chats={};
s.chats.fM=function(d,e){e=[];
    d.forEach(function(v){
        if(v){e.push(v)}
    });
    return e;
};
//s.channels={};
//s.channels.ch=function(d){
//    if(s.c[d.uid]&&s.c[d.uid][d.bid]&&Object.keys(s.c[d.uid][d.bid]).length>0&&(!s.cv[d.uid]||!s.cv[d.uid][d.bid]||Object.keys(s.cv[d.uid][d.bid]).length===0)&&(!s.channels[d.uid]||!s.channels[d.uid][d.bid]||Object.keys(s.channels[d.uid][d.bid].j).length===0)){
//        d.fn=function(){
//            if(s.channels[d.uid]){delete(s.channels[d.uid][d.bid])};if(s.cv[d.uid]){delete(s.cv[d.uid][d.bid])};if(s.c[d.uid]){delete(s.c[d.uid][d.bid])};
//        }
//        d.le=s.chats.fM(s.c[d.uid][d.bid]);d.lo=JSON.stringify(d.le);
//        if(s.c[d.uid][d.bid].length>30){
//            sql.query('SELECT id FROM Chats WHERE ke=? AND id=? AND start=?',[d.uid,d.bid,s.channels[d.uid][d.bid].s],function(er,r){
//                if(r&&r[0]){
//                    sql.query("UPDATE Chats SET history=? WHERE ke=? AND id=? AND start=?",[d.lo,d.uid,d.bid,s.channels[d.uid][d.bid].s],function(){
//                         d.fn();
//                    });
//                }else{
//                    sql.query("INSERT INTO Chats (start,history,id,ke,co) VALUES (?,?,?,?,?)",[s.channels[d.uid][d.bid].s,d.lo,d.bid,d.uid,0],function(){
//                         d.fn();
//                    });
//                }
//            });
//        }
//    }
//};
io.on('connect', function (cn) {
cn.on('f',function(d,q){
    try{
    if(d.bid&&d.uid){
function tx(z){//Connection Sender
    if(!z.uid){z.uid=d.uid};if(!z.bid){z.bid=d.bid};cn.emit('ret',z);
}
        switch(d.f){
//            case're'://record screen functions
//                switch(d.ff){
//                    case's'://save recording
//                            
//                            d.start=s.visitors[cn.uid][cn.bid].fti;
//                            sql.query("SELECT * from Recordings WHERE ke=? AND id=? AND start=?",[cn.uid,cn.bid,d.start],function(er,r,g){
//                                if(r&&r[0]){
//                                    sql.query("UPDATE Recordings SET data=? WHERE ke=? AND id=? AND start=?",[d.d,cn.uid,cn.bid,d.start])
//                                }else{
//                                    sql.query("INSERT INTO Recordings SET ?",{id:cn.bid,ke:cn.uid,start:d.start,data:d.d});
//                                }
//                            })
//                        })
//                    break;
//                }
//            break;
            case'data':
                d.a={hook:d.data,uri:'cx',uid:cn.uid,time:s.moment()};d.a.ip=cn.ip;
                if(d.data.id){d.a.hook.id=cn.bid;}
                atx(d.a,cn.uid);
                if(d.data.time===1){d.data.time=d.a.time}
                if(d.data.stor){
                    if(d.data.stor.get){
                        red.get('CVAL_'+cn.uid,function(er,rd){rd=s.jp(rd);
                            tx({stor:{key:d.data.stor.get,value:rd[d.data.stor.get]}});
                        })
                    }
                    if(d.data.stor.put&&d.data.stor.value){
                        switch(d.data.stor.value){
                            case'/time':
                                d.data.stor.value=d.a.time;
                            break;
                        }
                        red.get('CVAL_'+cn.uid,function(er,rd){rd=s.jp(rd);
                            rd[d.data.stor.put]=d.data.stor.value;
                            s.stt("CVAL_"+cn.uid,s.js(rd));
                        })
                    }
                }
                if(d.data.broadcast===1){s.tx(d.a,cn.uid,cn);}
                if(d.data.log){
                    if(d.data.note){d.data.log.note=d.data.note;}
                    if(!d.data.log.c){d.data.log.c=1}
                    d.data.log.ip=cn.ip,d.data.log.origin='cx';
                    s.log(cn.uid,d.data.log);
                    if(d.a.hook.id){s.log(cn.uid,d.data.log,cn.bid);}
                }
            break;
            case's'://SEND FUNCTION
                switch(d.ff){
                    case'r':
                        if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                            s.tx(d,d.uid+'_'+d.bid,cn);
                        }else{
                            aatx(d,cn.uid+'_'+cn.bid,cn);
                        }
                    break;
                    case 0://on type
                        s.tx(d,cn.uid+'_'+cn.bid,cn);
                    break;
                    case 1://on dynamic type
                        s.tx(d,d.uid+'_'+d.bid,cn);
                    break;
                    case't'://Run tool functions
                        if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                            d.arr={}
                            if(d.form){
                                if(d.form.scr&&d.form.pgr){
                                if(d.form.scr.length!==0){
                                    d.arr.scrollTo=d.form.scr
                                }
                                if(d.form.pgr.length!==0){
                                    d.arr.goTo=d.form.pgr
                                }
                                }
                                if(d.form.script.length!==0){
                                    d.arr.script=d.form.script
                                }
                            }
                            if(d.fn){
                                d.fn.cn=cn.id;
                                d.arr=d.fn;
                            }
                            s.tx(d.arr,d.vid);
                        }
                    break;
                    case'a'://Admin to Admin Send Function
                        d.m.time=moment().format();
                        s.tx({amsg:d.m},d.s)
                    break;
                    case'b':
                        if(!d.m||d.m.d===''){return}
                        red.get("CHAT_"+d.uid+"_"+d.bid,function(err,rd){rd=s.jp(rd);
                            if(!rd)rd=[];
                            d.m.time=moment().format();d.m.sender=cn.bid,d.m.rid=d.bid;
                            s.tx({msg:d.m},d.uid+'_'+d.bid,cn);
    //                        if(rd.length>29){delete(rd[0])}
                            rd.push(d.m);
                            s.stt("CHAT_"+d.uid+"_"+d.bid,s.js(rd))
                        });
                    break;
                    case 'c'://clear mmessages
                        if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                            red.get("CHAT_"+d.uid+"_"+d.bid,function(err,rd){rd=s.jp(rd);
                                if(rd){
                                    switch(d.fff){
                                        case 0:
                                            if(d.t){
                                            d.arr=[];
                                            rd.forEach(function(v){
                                                if(!v||v.d.indexOf(d.t)>-1){return false};
                                                d.arr.push(v);
                                            });
                                            rd=d.arr;delete(d.arr);
                                            s.tx(d,d.uid+'_'+d.bid,cn);
                                            }
                                        break;
                                        case'r':
                                            rd=[];
                                            s.tx({remove:d.r},d.uid+'_'+d.bid,cn);
                                        break;
                                    }
                                }
                                s.stt("CHAT_"+d.uid+"_"+d.bid,s.js(rd))
                            });
                        }
                    break;
                    default://Default Send Function
                        if(cn.uid&&cn.bid){
                            if(!d.m||d.m.d===''){return}
                            if(!d.u){d.u=d.uid}
                            if(!d.s){d.bi=d.bid}else{d.bi=d.s;}
                            red.get("CHAT_"+d.u+"_"+d.bi,function(err,rd){
                                if(rd==='{}'){rd='[]'};rd=s.jp(rd,[]);if(!rd){if(!d.y&&(!s.visitors[d.u]||!s.visitors[d.u][d.bi])){
//                                    sql.query("SELECT history,user FROM Chats where ke=? AND id=? DESC LIMIT 1",[d.u,d.bi],function(er,r,g){
//                                        r=JSON.parse(r[0].user);
//                                        if(r.mail&&s.vmail(r.mail)){
//                                            d.mailOptions = {
//                                                from: '"CloudChat Away Message" <message@cloudchat.online>',
//                                                to: r.mail,
//                                                subject: 'Sorry we missed you.',
//                                                text: d.m.d,
//                                                html: d.m.d
//                                            };
//
//                                            transporter.sendMail(d.mailOptions, function(error, info){
//                                                if(error){
//                                                    tx({pnote:'wgp',pnotm:0,b:d.bi,u:d.u});
//                                                }
//                                            });
//                                        }
//                                    })
                                    tx({pnote:'wgp',pnotm:0,b:d.bi,u:d.u});return;
                                };rd=[]}
                                d.m.time=s.moment();
                                d.m.sender=cn.bid,d.m.rid=d.bi;
                                if(!d.m.uid){d.m.uid=d.uid};
                                if(s.a[cn.uid]&&!s.a[cn.uid][cn.id]){//User
                                    atx({msg:d.m,uid:d.uid},d.u)
                                }else{//Admin
                                    s.tx({msg:d.m},d.u+'_'+d.s,cn);
                                }
                                if(d.y&&rd.length>29){rd.shift()}
                                rd.push(d.m);
                                s.stt("CHAT_"+d.u+"_"+d.bi,s.js(rd));
                                if(d.m.file){
                                    red.get('FILES_'+cn.uid,function(er,rd){rd=s.jp(rd);
                                        switch(d.x){
                                            case 1:
                                                rd[d.file.name]=d.file;
                                            break;
                                            case 0:
                                                delete(rd[d.file.name]);
                                            break;
                                        }
                                       s.stt("FILES_"+cn.uid,s.js(rd))
                                    })
                                }
                            });
                        }
                    break;
                }
            break;
            case'a'://ADMIN STUFF
                if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                switch(d.ff){
                    case'l'://Log functions
                        switch(d.fff){
                            case'd':
                                red.get("LOG_"+d.uid+"_"+d.bid,function(err,rd){rd=s.jp(rd,[]);
                                    if(rd.length>0){d.ar=[];
                                        rd.forEach(function(v){
                                            if(d.ts!==v.t){d.ar.push(v)}
                                        })
                                        s.stt("LOG_"+d.uid+"_"+d.bid,s.js(d.ar))
                                    }
                                })
                            break;
                        }
                    break;
                    case'sh'://share controller
                        switch(d.fff){
                            case'o':case'r':
                                if(d.m&&d.m!==''){
                                    sql.query("SELECT ke from Users where mail=?",[d.m],function(er,r,g){
                                        if(r&&r[0]){
                                            d.uid=r[0].ke
                                if(d.uid!==cn.uid){
                                    sql.query("SELECT shto,perm from Users where ke='"+cn.uid+"'",function(er,r,g){
                                        if(r&&r[0]){r=r[0];
                                            try{r.shto=JSON.parse(r.shto)}catch(e){r.shto=[]}
                                            d.i=r.shto.indexOf(d.uid)
                                            switch(d.fff){
                                                case'o':
                                                    if(d.i===-1){
                                                            r.shto.push(d.uid)
                                    sql.query("SELECT name,mail from Users where ke='"+d.uid+"'",function(er,rr,g){rr=rr[0];
                                       tx({pnote:'lg',pnotm:1,name:rr.name,mail:rr.mail,ke:d.uid})
                                    })
                                                            d.lr=s.lr('1AA_A_'+d.uid)
                                                            if((d.lr instanceof Object || d.lr instanceof Array)&&d.lr.length>0){
                                                                d.lr.forEach(function(v){
                                                                    if(s.a[s.onlineOperators[cn.uid][v].u]&&s.a[s.onlineOperators[cn.uid][v].u][v]){
                                                                        s.onlineOperators[cn.uid][v]={u:d.uid}
                                                                        s.gs(v).join('1AA_A_'+cn.uid)
                                                                        s.tx({users:s.visitors[cn.uid],pnote:{title:'Lucky you!',type:'success',text:s.a[cn.uid][cn.id].n+' Shared their visitors with you.'}},v)
                                                                        aatx({ao:s.cd(cn.uid),uid:cn.uid},cn.uid)
                                                                    }
                                                                })
                                                            }else{
                                                                return;
                                                            }
                                                    }else{
                                                        tx({pnote:'ncm',pnotm:'Already shared with Operator'});return;
                                                    }
                                                break;
                                                case'r':
                                                    if(d.i>-1){
                                                        r.shto=r.shto.filter(function(n){return n!=d.uid})
                                                        tx({pnote:'lg',pnotm:0,u:d.uid})
                                                        d.lr=s.lr('1AA_A_'+d.uid)
                                                        if((d.lr instanceof Object || d.lr instanceof Array)&&d.lr.length>0){
                                                            d.lr.forEach(function(v){
                                                                if(s.a[s.onlineOperators[cn.uid][v].u]&&s.a[s.onlineOperators[cn.uid][v].u][v]){
                                                                    s.gs(v).leave('1AA_A_'+cn.uid),delete(s.onlineOperators[cn.uid][v]),s.tx({remove:['[uid="'+cn.uid+'"]']},v);
                                                                    aatx({ao:s.cd(cn.uid),uid:cn.uid},cn.uid);
                                                                }
                                                            })
                                                        }else{
                                                            return;
                                                        }
                                                    }else{
                                                        tx({pnote:'ncm',pnotm:'You have not shared with this Operator'})
                                                        return;
                                                    }
                                                break;
                                            }
                                            s.a[cn.uid][cn.id].shto=r.shto;
                                            sql.query("UPDATE Users SET shto=? WHERE ke=?",[JSON.stringify(r.shto),cn.uid],function(){
                                            sql.query("SELECT shfr from Users where ke='"+d.uid+"'",function(er,rr,g){
                                        if(rr&&rr[0]){rr=rr[0];
                                            try{rr.shfr=JSON.parse(rr.shfr)}catch(e){rr.shfr=[]}
                                            d.i=rr.shfr.indexOf(cn.uid)
                                            switch(d.fff){
                                                case'o':
                                                    if(d.i===-1){
                                                        rr.shfr.push(cn.uid)
                                                    }
                                                break;
                                                case'r':
                                                    if(d.i>-1){
                                                        rr.shfr=rr.shfr.filter(function(n){return n!=cn.uid})
                                                    }
                                                break;
                                            }
                                                      sql.query("UPDATE Users SET shfr=? WHERE ke=?",[JSON.stringify(rr.shfr),d.uid])
                                                   }
                                            })
                                            })
                                        }else{
                                            tx({pnote:'onf'})
                                        }
                                    })
                                }else{
                                    tx({pnote:'css'})
                                }
                                }else{
                                    tx({pnote:'onf'})
                                }
                                    })
                                }else{
                                    tx({pnote:'onf'})
                                }
                            break;
                        }
                    break;
                    case'new':
                        if(cn.uid==='2Df5hBE'||cn.uid==='VTv9w3M'){
                            cn.broadcast.emit('ret',{new:1});
                        }
                    break;
                    case'ver':
                        if(cn.uid==='2Df5hBE'||cn.uid==='VTv9w3M'){
                            s.ver=d.ver;cn.broadcast.emit('ret',{ver:s.ver});
                        }
                    break;
                    case'diag'://get all current server info
tx({active_users:s.visitors[d.uid],active_admins:s.a,online_admins:s.onlineOperators[d.uid],active_convos:s.c,version:s.ver})
                    break;
                    case'ccj'://join operator channel
                        if(d.x===1){
                            if(!s.cv[d.uid])s.cv[d.uid]={};
                            if(!s.cv[d.uid][d.bid])s.cv[d.uid][d.bid]={};
                            if(!s.channels[d.uid])s.channels[d.uid]={};
                            red.get("CHAT_"+d.uid+"_"+d.bid,function(err,rd){rd=s.jp(rd);
                                if(!s.channels[d.uid][d.bid])s.channels[d.uid][d.bid]={j:{},s:s.moment()};
                                if(!rd)rd=[];
                                if(!s.channels[d.uid][d.bid].j[cn.uid+'_'+cn.bid]){
                                    cn.join(d.uid+'_'+d.bid);
                                    if(s.a[cn.uid]&&s.a[cn.uid][cn.id]&&!s.a[cn.uid][cn.id].chh[d.uid]){s.a[cn.uid][cn.id].chh[d.uid]={}}
                                    s.a[cn.uid][cn.id].chh[d.uid][d.bid]={}
                                    s.channels[d.uid][d.bid].j[cn.uid+'_'+cn.bid]=s.ad(s.a[cn.uid][cn.id],cn.id);
                                    s.tx({chan:s.channels[d.uid][d.bid],uid:d.uid,bid:d.bid},d.uid+'_'+d.bid);
                                    tx({chad:rd,uid:d.uid,bid:d.bid,chxa:s.cv[d.uid][d.bid]})
                                }
//                            s.stt("CHAT_"+d.u+"_"+d.bi,s.js(rd))
                            });
                        }else{
                            if(s.channels[d.uid]&&s.channels[d.uid][d.bid]&&s.channels[d.uid][d.bid].j[cn.uid+'_'+cn.bid]){
                                cn.leave(d.uid+'_'+d.bid);
                                delete(s.a[cn.uid][cn.id].chh[d.uid][d.bid]);delete(s.channels[d.uid][d.bid].j[cn.uid+'_'+cn.bid]);
                                s.tx({chan:s.channels[d.uid][d.bid],uid:d.uid,bid:d.bid,chxa:s.cv[d.uid][d.bid]},d.uid+'_'+d.bid);
                            }
                        }
                    break;
                    case'cj'://join chatroom for user
                        if(s.a[cn.uid]&&s.visitors[d.uid]){
                            if(!d.uid){d.uid=cn.uid}
                            //start join
                            d.ret={cj:d.cj,x:d.x,adm:{x:d.x,u:cn.uid,b:cn.bid,n:s.a[cn.uid][cn.id].n,peer:s.a[cn.uid][cn.id].peer},uid:d.uid,bid:d.bid};
                            if(d.x!==0){
                            //check if free
                            if(s.a[cn.uid][cn.id].level===0){
                                d.q=0;
                                Object.keys(s.a[cn.uid][cn.id].joined).forEach(function(v){
                                    d.q=d.q+Object.keys(s.a[cn.uid][cn.id].joined[v]).length;
                                });
                                if(d.q>5){tx({f:'cjx',uid:d.uid,bid:d.bid});return;}
                            }
                                if(s.visitors[d.uid]&&s.visitors[d.uid][d.bid]){
                                    if(!s.visitors[d.uid][d.bid].pj[cn.uid]){
                                        s.visitors[d.uid][d.bid].pj[cn.uid]={};
                                    }
                                    if(!s.visitors[d.uid][d.bid].pj[cn.uid][cn.bid]){
                                        s.visitors[d.uid][d.bid].pj[cn.uid][cn.bid]={t:[],te:[]};
                                    }
                                    s.visitors[d.uid][d.bid].pj[cn.uid][cn.bid].t.push(s.moment())
                                    if(!s.visitors[d.uid][d.bid].joined[cn.uid]){
                                        s.visitors[d.uid][d.bid].joined[cn.uid]={};
                                    }
                                    s.visitors[d.uid][d.bid].joined[cn.uid][cn.bid]={u:cn.uid,b:cn.bid,n:s.a[cn.uid][cn.id].n}
                                    if(!s.a[cn.uid][cn.id].joined[d.uid]){
                                        s.a[cn.uid][cn.id].joined[d.uid]={};
                                    }
                                    s.a[cn.uid][cn.id].joined[d.uid][d.bid]={u:d.uid,n:s.visitors[d.uid][d.bid].name}
                                    if(s.visitors[d.uid][d.bid].cap==0){d.mom=s.moment(),s.visitors[d.uid][d.bid].cap=d.mom;d.ret.cap=d.mom};
                                    d.ret.adm.pp=s.a[cn.uid][cn.id].pp;
                                    if(!d.xx){s.tx(d.ret,d.uid+'_'+d.bid);};
                                    atx({uid:d.uid,bid:d.bid,joined:s.visitors[d.uid][d.bid].joined},d.uid);
                                    cn.join(d.uid+'_'+d.bid);
                                    s.tx({uid:d.uid,bid:d.bid,cap:s.visitors[d.uid][d.bid].cap,pj:s.visitors[d.uid][d.bid].pj},d.uid+'_'+d.bid);
                                }
                            }else{
                                cn.leave(d.uid+'_'+d.bid)
                                if(s.a[cn.uid]&&s.a[cn.uid][cn.id]&&s.a[cn.uid][cn.id].joined[d.uid]&&s.a[cn.uid][cn.id].joined[d.uid][d.bid]){
                                    delete(s.a[cn.uid][cn.id].joined[d.uid][d.bid]);
                                }
                                if(s.visitors[d.uid]&&s.visitors[d.uid][d.bid]&&s.visitors[d.uid][d.bid].joined[cn.uid]&&s.visitors[d.uid][d.bid].joined[cn.uid][cn.bid]&&s.visitors[d.uid][d.bid].pj[cn.uid]){
                                    if(s.visitors[d.uid][d.bid].pj[cn.uid][cn.bid]){s.visitors[d.uid][d.bid].pj[cn.uid][cn.bid].te.push(s.moment())};
                                    delete(s.visitors[d.uid][d.bid].joined[cn.uid][cn.bid]);
                                    if(Object.keys(s.visitors[d.uid][d.bid].joined[cn.uid]).length===0){
                                        delete(s.visitors[d.uid][d.bid].joined[cn.uid]);
                                    }
                                    if(!d.xx){s.tx(d.ret,d.uid+'_'+d.bid);};
                                    atx({uid:d.uid,bid:d.bid,joined:s.visitors[d.uid][d.bid].joined},d.uid);
                                    s.tx({uid:d.uid,bid:d.bid,cap:s.visitors[d.uid][d.bid].cap,pj:s.visitors[d.uid][d.bid].pj},d.uid+'_'+d.bid);
                                }
                            }
                        }
                    break;
                    case'b':
                        s.tx(d,d.uid+'_'+d.bid,cn)
                    break;
                    case'g'://get
                        switch(d.fff){
                            case'r':
                                if(['rates',''].indexOf(d.ws)>-1){
        sql.query("UPDATE Details SET "+d.ws+"=? WHERE ke=?",[d.s,cn.uid]);
                                }
                            break;
                            case's'://stats
                                if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                                sql.query("SELECT * from Crumbs where ke=? AND DATE(`start`) > '"+d.d.start_date+"' and DATE(`end`) < '"+d.d.end_date+"'",[cn.uid],function(er,rr,g){if(er){return;}
                                sql.query("SELECT end,user,id from Chats where ke=? AND DATE(`start`) > '"+d.d.start_date+"' and DATE(`end`) < '"+d.d.end_date+"'",[cn.uid],function(er,rrr,g){if(er){return;}
                                sql.query("SELECT * from Ratings where ke=? AND DATE(time) between '"+d.d.start_date+"' and '"+d.d.end_date+"'",[cn.uid],function(er,rrrr,g){if(er){return;}
                                sql.query("SELECT * from Missed where ke=? AND DATE(`start`) > '"+d.d.start_date+"' and DATE(`end`) < '"+d.d.end_date+"'",[cn.uid],function(er,rrrrr,g){if(er){return;}
                                    tx({stats:{crumbs:rr,chats:rrr,rates:rrrr,miss:rrrrr}});
                                });
                                });
                                });
                                });
                                }
                            break;
                            case'g':
                                s.geo(d.ip,d.bid,d.uid)
                            break;
                            case'c'://chat
                                if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                                    if(d.tbid&&s.visitors[d.uid]&&s.visitors[d.uid][d.tbid]&&s.visitors[d.uid][d.tbid].vid){
                                tx({bid:d.tbid,vid:s.visitors[d.uid][d.tbid].vid,cid:cn.id})
                                if(s.visitors[d.uid][d.tbid].brd){
                                    tx({brd:s.visitors[d.uid][d.tbid].brd,bid:d.tbid})
                                }
                                d.arr={bid:d.tbid,uid:d.uid};
                                        red.get("CHAT_"+d.uid+"_"+d.tbid,function(err,rd){rd=s.jp(rd);
                        red.get("LOG_"+d.uid+"_"+d.tbid,function(err,rlog){
                            d.fn=function(){
                                if((!rd)||(rd&&rd.length===0)){
                                    rd=[]
                                    sql.query("SELECT history from Chats where id=? AND ke=? ORDER BY `start` DESC LIMIT 1",[d.tbid,d.uid],function(er,r,g){
                                        if(r&&r[0]){
                                            d.arr.history=JSON.parse(r[0].history);
                                        }else{
                                            d.arr.history=rd;
                                        }
                                        tx(d.arr)
                                    })
                                }else{
                                    d.arr.history=rd;
                                    tx(d.arr)
                                }
                            }
                            rlog=s.jp(rlog,[]);
                            if(rlog.length===0){
                                sql.query("SELECT * from Logs where id=? AND ke=? ORDER BY `start` DESC LIMIT 1",[d.tbid,d.uid],function(er,rr,g){
                                    if(er){return;}
                                    if(rr&&rr[0]){
                                        try{rr=JSON.parse(rr[0].history)}catch(e){rr=[]};//rd=r
                                        d.arr.ulogs=rr;
                                    }
                                    d.fn()
                                })
                            }else{d.arr.ulogs=rlog;d.fn()}
                                    })
                                    })
                                }
                                }
                            break;
                        }
                    break;
                    case's':
                        switch(d.fff){
                            case'op':
                                s.tx({bg:d.s},d.uid);
                            break;
                            case'f'://settings save
                                if(s.a[cn.uid][cn.id]&&d.s){
                                    if(isNaN(parseInt(d.ws))===false){d.ws=parseInt(d.ws)};
                                        switch(d.ws){
                                            case'app':
                                                d.fn=function(){
                                                    Object.keys(d.s).forEach(function(v){
                                                        if(v=='firebase'&&d.s[v]['apiKey']===''){return}
                                                        d.ar[v]=d.s[v];
                                                    })
                                                }
                                                if(d.s.firebase){
                                                    s.stt('FB_'+cn.uid,s.js(d.firebase))
                                                }else{
                                                    red.del('FB_'+cn.uid);
                                                }
//                                                if(cn.mas===1){
                                                  sql.query("SELECT ids FROM Users WHERE ke=?",[cn.uid],function(er,r){ 
                                                    d.ar=JSON.parse(r[0].ids);d.fn();
                                                    sql.query("UPDATE Users SET ids=? WHERE ke=?",[JSON.stringify(d.ar),cn.uid],function(er){
                                                        tx({pnote:'ust'});
                                                    })
                                                  })
//                                                }else{
//                                                  sql.query("SELECT subs FROM Details WHERE ke=?",[cn.uid],function(er,r){
//                                                      r=JSON.parse(r[0].subs),d.ar=r[cn.bid];d.fn();
//                                                    r[cn.bid]=d.ar;
//                                                    sql.query("UPDATE Details SET subs=? WHERE ke=?",[JSON.stringify(r),cn.uid],function(er){ 
//                                                        tx({pnote:'ust'});
//                                                    })
//                                                  })
//                                                }
                                            break;
                                            case'api':
                                                switch(d.ffff){
                                                    case'i':
                                              sql.query("INSERT INTO API (ke,code,detail) VALUES (?,?,?)",[cn.uid,d.s,JSON.stringify({ip:s.a[cn.uid][cn.id].ip,name:s.a[cn.uid][cn.id].n,bid:cn.bid})],function(er,r){
                                               tx({pnote:'ust'});   
                                              });
                                                    break;
                                                    case'd':
                                              sql.query("DELETE FROM API WHERE ke=? AND code=?",[cn.uid,d.s],function(er,r){
                                               tx({pnote:'ust'});   
                                              });
                                                    break;
                                                    case'u':
                                                      sql.query("SELECT * FROM API WHERE ke=? AND code=?",[cn.uid,d.s],function(er,r){
                                                          if(r&&r[0]){
                                                              r=r[0];r.detail=JSON.parse(r.detail);
                                                              r.detail[d.n]=d.v;
                                                          sql.query("UPDATE API SET detail=? WHERE ke=? AND code=?",[JSON.stringify(r.detail),cn.uid,d.s],function(){
                                                              tx({pnote:'ust'});
                                                          });
                                                          }
                                                      });
                                                    break;
                                                }
                                            break;
                                            case'profile':
                                              sql.query("SELECT ids FROM Users WHERE ke=?",[cn.uid],function(er,r){
                                                if(r&&r[0]){
                                                    d.vv=Object.keys(d.s);d.ar=[];d.arr=[];
                                                    d.vv.forEach(function(v){
                                                     switch(v){
                                                         case'name':case'mail':case'login':case'pass':case'ref':
                                                             if(d.s[v]==''){return false;}
                                                             if(v==='pass'){d.s[v]=crypto.createHash('md5').update(d.s[v]).digest("hex")}
                                                                d.ar.push(v+"=?");d.arr.push(d.s[v]);
                                                         break;
                                                         case'pp':case'banned':case'bannedf':
                                                             if(!d.ops){d.ops=JSON.parse(r[0].ids);};
                                                             if(v==='banned'){s.stt('BANNED_'+cn.uid,JSON.stringify([d.s[v],d.s.bannedf]))}
                                                             d.ops[v]=d.s[v];
                                                         break;
                                                        }
                                                    });
                                                    if(d.ops){
                                                        d.ar.push('ids=?');d.arr.push(JSON.stringify(d.ops));
                                                    }
                                                    d.arr.push(cn.uid);
                                                    sql.query("UPDATE Users SET "+d.ar.join(',')+" WHERE ke=?",d.arr,function(er){
                                                        tx({pnote:'ust'});
                                                    })
                                                }
                                               })
                                            break;
                                            case 0://dynamic Users saver
                                                if(d.idx){
                                                    if(d.idx!=='name'||d.idx!=='mail'){return false;}
                                                    if(isNaN(parseInt(''+cn.bid))==false){
                                                        sql.query("UPDATE Users SET "+d.idx+"=? WHERE ke=?",[d.s,cn.uid],function(er){
                                                            tx({pnote:'ust'});
                                                        })
                                                    }
                                                }
                                            break;
                                            case 5://dynamic Users.ids saver
                                                if(d.idx){
                                                sql.query("SELECT ids FROM Users WHERE ke=?",[cn.uid],function(er,r){
                                                    if(r&&r[0]){
                                                        r=JSON.parse(r[0].ids);r[d.idx]=d.s;
                                                        if(d.idx==='trusted'){s.stt('TRUST_'+cn.uid,d.s)}
                                                        sql.query("UPDATE Users SET ids=? WHERE ke=?",[JSON.stringify(r),cn.uid],function(er){
                                                        tx({pnote:'ust'});
                                                        })
                                                    }
                                                })
                                                }
                                            break;
                                            case 1:case 3:case 4:case 6:case 8://save function for most of the settings pages
                                                sql.query("SELECT ids,type FROM Users WHERE ke=?",[cn.uid],function(er,r){
                                                    if(r&&r[0]){r=r[0];
                                                        //check
                                                        switch(d.ws){
                                                            case 1://sub account limit check
                                                                d.s=JSON.parse(d.s);
                                                                d.ss=Object.keys(d.s);
                                                                d.sss={}
                                                                switch(r.type){
                                                                    case 0:
                                                                        d.ss=d.ss.slice(0,2);
                                                                    break;
                                                                    case 1:
                                                                        d.ss=d.ss.slice(0,5);
                                                                    break;
                                                                }
                                                                d.ss.forEach(function(v){
                                                                    d.sss[v]=d.s[v];
                                                                })
                                                                d.s=JSON.stringify(d.sss);
                                                            break;
                                                        }
                                                        //submit
                                                        sql.query("SELECT ke FROM Details WHERE ke=?",[cn.uid],function(er,rr){
                                                            if(rr&&rr[0]){
                                                                switch(d.ws){case 8:d.ws='chans';break;case 1:d.ws='subs';break;case 3:d.ws='resp';break;
                                                                    case 6:case 4:
                                                                        if(d.ws===6){d.ws='rates',d.wss='ry';s.stt('RAT_K_'+cn.uid,d.sc)}else{d.ws='depts',d.wss='dp';s.stt('DEP_K_'+cn.uid,d.sc)}
                                                                                r=JSON.parse(r.ids);r[d.wss]=d.sc;s[d.wss][cn.uid]=d.sc;
                                                                                sql.query("UPDATE Users SET ids=? WHERE ke=?",[JSON.stringify(r),cn.uid],function(er){d.wss={sc:d.sc};d.wss[d.ws]=d.s;
                                                                                    s.tx(d.wss,cn.uid);
                                                                                })
                                                                    break;
                                                                }
                                                                sql.query("UPDATE Details SET "+d.ws+"=? WHERE ke=?",[d.s,cn.uid]);
                                                            }else{
                                                                ['resp','depts','subs','rates','chans'].forEach(function(v){
                                                                    if(!d.s[v]){d.s[v]='{}'}
                                                                });
                                                                sql.query("INSERT INTO Details SET ?",d.s);
                                                            }
                                                            tx({pnote:'ust'});
                                                            //send new settings to other accepted superusers
                                                        })
                                                    }
                                                })
                                            break;
                                            case 2:
                                                sql.query("SELECT ids FROM Users WHERE ke=?",[cn.uid],function(er,r){
                                                    if(r&&r[0]){
                                                        r=JSON.parse(r[0].ids);r.sc=d.gid;
                                                        s.stt('STY_K_',r.sc),s.stt('STY_',d.s);
                                                        sql.query("UPDATE Users SET ops=?,ids=? WHERE ke=?",[d.s,JSON.stringify(r),cn.uid],function(er){
                                                        tx({pnote:'ust'});s.tx({bg:d.s,sc:d.gid},cn.uid);
                                                        })
                                                    }
                                                })
                                            break;
                                        }
                                   atx({settings:d},cn.uid,cn)
                                }
                            break;
                            case'o'://online/offline status and emit count of all
                                if(d.o){
                                d.fn=function(v){
                                    s.a[v][cn.id].status=d.o;
                                    d.ca={at:s.ad(s.a[v][cn.id],cn.id),uid:v}
                                    aatx(d.ca,v);
                                };d.fn(cn.uid);
                                }
                            break;
                        }
                    break;
                    case'e':
                        if(d.form&&d.bid&&d.uid&&s.visitors[d.uid]&&s.visitors[d.uid][d.bid]){
                            if(d.form.name){s.visitors[d.uid][d.bid].name=d.form.name}
                            if(d.form.mail){s.visitors[d.uid][d.bid].mail=d.form.mail}
                            s.tx(d,d.uid+'_'+d.bid);
                        }
                    break;
                }
                }else{
                        switch(d.ff){
                    case'su':default://init admin
                            sql.query("SELECT * from Auth where ke=? AND id=? AND auth=?",[d.uid,d.bid,d.auth],function(er,rr,z){
                                if(er){cn.disconnect();return}
                                if(rr&&rr[0]){rr=rr[0];
                                    cn.bid=d.bid,cn.uid=d.uid;cn.mas=rr.mas;
                                    sql.query("SELECT perm,ids,name,type,shto,shfr from Users where ke='"+d.uid+"' ",function(err,r){
                                        if(err){cn.disconnect();return}
                                        if(r&&r[0]){
                                            r=r[0];d.qs=[];
                                            r.shto=JSON.parse(r.shto);
                                            r.shfr=JSON.parse(r.shfr);
                                        r.shto.forEach(function(v){
                                            d.qs.push("ke='"+v+"'");
                                        })
                                        sql.query("SELECT ke,perm,name,type,mail from Users where "+(d.qs.join(' OR ')),function(er,g){
                                            tx({shto:g})
                                        })
                                            err=function(xx,r){
                                                try{r.perm=JSON.parse(r.perm)}catch(t){r.perm={online:5}}
                                                try{r.ids=JSON.parse(r.ids)}catch(t){r.ids={}}
                                                if(!s.a[xx]){s.a[xx]={}}
                                                 er=function(){
                                                    s.a[xx][cn.id]={ip:cn.request.connection.remoteAddress,uid:xx,vid:cn.id,bid:d.bid,n:r.name,joined:{},pp:r.ids.pp,peer:d.peer,status:1,chh:{}};
                                                    s.a[xx][cn.id].level=r.type;
                                                    //s.log(xx,{id:d.bid,ip:cn.ip,status:1});//log
                                                    //admin init with online count check
                                                    z=function(){
                                                        if(!s.onlineOperators[xx]){s.onlineOperators[xx]={}}
                                                        s.onlineOperators[xx][cn.id]={u:cn.uid}
                                                        cn.join('1AA_A_'+xx)
                                                        aatx({ao:s.cd(xx),uid:xx},xx),tx({f:'i',cid:cn.id,users:s.visitors[xx],uid:xx})
                                                    }
                                                    if(r.type==0){
                                                        if(!r.perm.online){r.perm.online=5;}
                                                        if(s.ca(xx)>r.perm.online){
                                                            if(!r.name){r.name=xx}   
                                                            tx({pnote:'nmu',pnotm:r.name,uid:xx,ao:s.cd(xx)})
                                                        }else{
                                                            z();
                                                        }
                                                    }else{z();}
                                                }
                                               if(cn.mas!==1){
                                                    sql.query("SELECT subs from Details where ke='"+xx+"' ",function(errr,rrr){
                                                       if(errr){return} rrr=JSON.parse(rrr[0].subs);r.ids.pp=rrr[d.bid].PP;r.name=rrr[d.bid].Name;er();
                                                    })
                                                }else{
                                                    er()
                                                }
                                            }
                                            err(cn.uid,r);
                                            if(r.shfr.length>0){
                                            d.qs=[];
                                            r.shfr.forEach(function(v){
                                                d.qs.push("ke='"+v+"'");
                                            })
                                    sql.query("SELECT ke,perm,name,type,mail from Users where "+(d.qs.join(' OR ')),function(er,g){
                                        g.forEach(function(v){
                                            err(v.ke,v);
                                        })
                                    })
                                            }
                                            
                                        }else{tx({fraud:{}});cn.disconnect()}
                                    });
                                }else{tx({fraud:{}});cn.disconnect()}
                            });
                        break;
                    }
                    }
            break;
            case'j'://REGULAR USER STUFF
                switch(d.ff){
                    case'pr':
                        //make so it not send to user other windows
//                        s.tx(d,d.uid+'_'+d.bid,cn)
                        s.tx(d,d.cn)
                    break;
                    case'n'://name/mail change by user
                        if(d.form&&cn.bid&&cn.uid&&s.visitors[cn.uid]&&s.visitors[cn.uid][cn.bid]){
                            if(d.form.name){s.visitors[cn.uid][cn.bid].name=d.form.name}
                            if(d.form.mail){s.visitors[cn.uid][cn.bid].mail=d.form.mail}
                            d.f='a';d.ff='e';aatx(d,cn.uid+'_'+cn.bid,cn);
                        }
                    break;
                    case'ch'://regular channel visitor
                        if(d.fff===0&&cn.bid){s.cv[cn.uid][cn.$bid][cn.bid].n=d.n;return;}
                        clearTimeout(s.nf[d.bid+'_'+d.uid+'_'+d.$bid]);
                        cn.uid=d.uid,cn.bid=d.bid,cn.$bid=d.$bid;
                        if(!s.cv[d.uid])s.cv[d.uid]={};
                        if(!s.cv[d.uid][d.$bid])s.cv[d.uid][d.$bid]={};
                        if(!s.cv[d.uid][d.$bid][d.bid]){s.cv[d.uid][d.$bid][d.bid]=d.u;}
                        s.cv[d.uid][d.$bid][d.bid].ip=d.ip||cn.request.connection.remoteAddress
                        s.cv[d.uid][d.$bid][d.bid].vid={};
                        s.cv[d.uid][d.$bid][d.bid].vid[cn.id]={};
                                    red.get("CHAT_"+d.uid+"_"+d.$bid,function(err,rd){rd=s.jp(rd);
                        if(!rd)rd=[];
                        d.tx={ao:s.cd(d.uid),uid:d.uid,chxa:s.cv[d.uid][d.$bid]};
                        if(s.channels[d.uid]&&s.channels[d.uid][d.$bid]){d.tx.chan=s.channels[d.uid][d.$bid]};d.tx.history=rd;
                        tx(d.tx);s.tx({chxn:1,$bid:d.$bid,bid:d.bid,uid:d.uid},d.uid+'_'+d.$bid);
                        cn.join(d.uid+'_'+d.$bid);
                                    })
                    break;
                    case'x'://user init
                        if(!d.ip){
                            cn.ip=cn.request.connection.remoteAddress
                        }else{
                            cn.ip=d.ip;
                        }
                        if(d.u.push!==1){s.stf(d.uid,{ip:cn.ip,trust:d.trust,sc:d.sc,ry:d.ry,dp:d.dp,cn:cn.disconnect},tx);}
                        cn.join(d.uid+'_'+d.bid),cn.join(d.uid);
                        clearTimeout(s.nf[d.bid+'_'+d.uid]);delete(s.nf[d.bid+'_'+d.uid]);
                        cn.uid=d.uid,cn.bid=d.bid,d.u.bid=d.bid,d.u.uid=d.uid
                        if(!s.visitors[d.uid]){s.visitors[d.uid]={}}
                        if(!s.visitors[d.uid][d.bid]){
                            d.u.ft=1,d.u.joined={},s.visitors[d.uid][d.bid]=d.u;
                        }else{++s.visitors[d.uid][d.bid].ft}
                        d.r=d.u.referrer
                        if(d.r===null||d.r===undefined){d.r=''}
                        if(!s.visitors[d.uid][d.bid].vid){
                            s.visitors[d.uid][d.bid].vid={}
                        }
                        s.visitors[cn.uid][cn.bid].url=d.u.url;
                        s.visitors[cn.uid][cn.bid].time=moment().format();
                        s.visitors[cn.uid][cn.bid].user_time=d.u.time;
                        s.visitors[cn.uid][cn.bid].title=d.u.title;
                        if(!s.visitors[d.uid][d.bid].geo){
                            s.geo(cn.ip,d.bid,d.uid)
                        }
                        if(!s.visitors[d.uid][d.bid].cap){s.visitors[d.uid][d.bid].cap=0}
                        s.visitors[d.uid][d.bid].pj={};s.visitors[d.uid][d.bid].referrer=d.u.referrer,s.visitors[d.uid][d.bid].ip=cn.ip,s.visitors[d.uid][d.bid].url=d.u.url,s.visitors[d.uid][d.bid].time=d.u.time,s.visitors[d.uid][d.bid].vid[cn.id]={u:d.u.url},s.visitors[d.uid][d.bid].chat=0,s.visitors[d.uid][d.bid].open=0;
                        if(s.visitors[d.uid][d.bid].ll!==2){s.visitors[d.uid][d.bid].ll=0}
                        if(!s.visitors[d.uid][d.bid].brd){s.visitors[d.uid][d.bid].brd=[]}
                        s.visitors[d.uid][d.bid].brd.push({href:d.u.url,referrer:d.r,ft:s.visitors[d.uid][d.bid].ft,time:s.moment()});d.kl=s.visitors[d.uid][d.bid].brd.length;if(d.kl>250){s.visitors[d.uid][d.bid].brd=s.visitors[d.uid][d.bid].brd.splice(0,(d.kl-250))}
                        red.get("FB_"+d.uid,function(err,rd){rd=s.jp(rd);
                        if(rd&&Object.keys(rd).length===0){rd={apiKey:"AIzaSyBZ68U1anJHhKLLt30f66BwmB7ED1ipht0",authDomain: "cloudchat-5bb80.firebaseapp.com",storageBucket: "cloudchat-5bb80.appspot.com"}}
                        s.visitors[d.uid][d.bid].fti=s.moment();d.tx={firebase:rd,ao:s.cd(d.uid),uid:d.uid};if(!s.visitors[d.uid][d.bid].fs||s.visitors[d.uid][d.bid].fs=="1"){d.tx.fs=s.moment();s.visitors[d.uid][d.bid].fs=d.tx.fs;};
                        tx(d.tx);
                        atx({f:'v',u:s.visitors[d.uid][d.bid],vid:s.visitors[d.uid][d.bid].vid,bid:d.bid,cid:cn.id,al:0},d.uid)
                        })
                       break;
                    case'b'://chat end
                        if(s.visitors[cn.uid][cn.bid].chat===1){s.log(cn.uid,{c:3,ip:cn.ip},cn.bid);}
                        s.visitors[cn.uid][cn.bid].chat=0
                        atx(d,cn.uid,cn);
                        d.k=Object.keys(s.visitors[cn.uid][cn.bid].vid)
                        ex({f:'x',ff:0},d.k);
                        //save chat because it ended
                        red.get("CHAT_"+cn.uid+"_"+cn.bid,function(err,rd){rd=s.jp(rd);
                        q={rr:s.visitors[cn.uid][cn.bid]};q.user=JSON.stringify({name:q.rr.name,mail:q.rr.mail,ip:cn.ip,pj:q.rr.pj})
                        if(rd&&rd[0]){q.time=rd[0].time}
                        if(q.rr.cap==0&&rd&&rd[0]&&rd.length>1){
                            q.qu="INSERT INTO Missed (start,id,ke,user) VALUES (?,?,?,?)";
                            q.qa=[q.time,cn.bid,cn.uid,q.user];atx({mhistory:rd,uid:cn.uid,bid:cn.bid,d:q.qa},cn.uid);
                            sql.query(q.qu,q.qa)
                        }
                        q.qu="SELECT * FROM Chats WHERE id=? AND ke=? AND `start`=?";
                        q.qa=[cn.bid,cn.uid,q.time];
                            q.ar=s.js(rd);
                            if(q.ar!=='[]'&&q.ar!=='{}'){
                                sql.query(q.qu,q.qa,function(err,r){
                                    if(!q.rr.co){q.rr.co=1};q.co=q.rr.co;
                                    if(r&&r[0]){
                                        q.qu="UPDATE Chats SET history=?,user=? WHERE `start`=? AND id=? AND ke=?";
                                        q.qa=[q.ar,q.user,q.time,cn.bid,cn.uid];
                                    }else{
                                        q.qu="INSERT INTO Chats (start,history,id,ke,co,user) VALUES (?,?,?,?,?,?)";
                                        q.qa=[q.time,q.ar,cn.bid,cn.uid,q.co,q.user];
                                    }
                                    sql.query(q.qu,q.qa,function(er){})
                                })
                            }
                            s.stt("CHAT_"+cn.uid+"_"+cn.bid,s.js(rd))
                        })
                    break;
                    case'o':
                        if(d.bid&&s.visitors[d.uid]&&s.visitors[d.uid][d.bid]){s.visitors[d.uid][d.bid].open=d.o
                        s.tx(d,d.uid+'_'+d.bid);
                        atx(d,d.uid);}
                    break;
                    default://chat init
                        if(s.visitors[cn.uid]&&s.visitors[cn.uid][cn.bid]){
                            if(s.visitors[cn.uid][cn.bid].chat!==1){s.log(cn.uid,{c:2,ip:cn.ip},cn.bid);}
                        if(Object.keys(s.visitors[cn.uid][cn.bid].joined).length>0){
                            tx({ad:s.visitors[cn.uid][cn.bid].joined})
                        }
                        s.visitors[cn.uid][cn.bid].name=d.u.name;
                        s.visitors[cn.uid][cn.bid].mail=d.u.mail;
                        s.visitors[cn.uid][cn.bid].dept=d.u.dept;
                        if(d.ch){d.chc=0;
                            d.fn=function(g,h){
                                if(s.a[g]){
                                    d.o=Object.keys(s.a[g]);
                                    d.o.forEach(function(b){
                                        if(s.a[g][b].bid===h){
                                            s.tx({poke:{uid:cn.uid,bid:cn.bid}},s.a[g][b].vid)
                                        }
                                    })
                                }
                            }
                            Object.keys(d.ch).forEach(function(v){
                                d.a=Object.keys(d.ch)[d.chc];
                                if(d.ch[d.a] instanceof Array){
                                    v.forEach(function(b){
                                        d.fn(d.a,b)
                                    })
                                }else{
                                    d.fn(d.a,d.ch[d.a])
                                }
                                ++d.chc
                            })
                        }
clearTimeout(s.nf[cn.bid+'_'+cn.uid]);delete(s.nf[cn.bid+'_'+cn.uid])
                        d.k=Object.keys(s.visitors[d.uid][d.bid].vid),s.visitors[d.uid][d.bid].chat=1;
                        d.tt={f:'ii',u:s.visitors[d.uid][d.bid],bid:d.bid,cid:cn.id};
                        atx(d.tt,d.uid);
                        red.get("CHAT_"+d.uid+"_"+d.bid,function(err,rd){rd=s.jp(rd);
                        if(!rd||(rd&&rd.length===0)){
                            rd=[];
                                    sql.query("SELECT * from Chats where id=? AND ke=? ORDER BY `start` DESC LIMIT 1",[d.bid,d.uid],function(er,r,g){if(er){return;}
                                        if(r&&r[0]){
                                            try{r=JSON.parse(r[0].history)}catch(e){r=[]};//rd=r
                                            ex({f:'x',ff:1,history:r},d.k)
                                        }else{
                                            ex({f:'x',ff:1,history:rd},d.k)
                                        };
                                    })
                        }else{
                            ex({f:'x',ff:1,history:rd},d.k)
                            if(s.visitors[d.uid][d.bid].ft===1){++s.visitors[d.uid][d.bid].co;}
                        }
                        if(s.visitors[d.uid][d.bid].ll==0){d.tt.al=1;s.visitors[d.uid][d.bid].ll=2}
                        })
                        }
                    break;
                }
            break;
            default:
                cn.disconnect();
            break;
        }
        }
        }catch(er){
            console.log(er)
        }
    });
    cn.on( 'disconnect', function(d,q) {
        if(cn.id&&cn.uid&&cn.bid){d={};
            if(s.cv[cn.uid]&&s.cv[cn.uid][cn.$bid]&&s.cv[cn.uid][cn.$bid][cn.bid]){
                delete(s.cv[cn.uid][cn.$bid][cn.bid].vid[cn.id])
                if(Object.keys(s.cv[cn.uid][cn.$bid][cn.bid].vid).length===0){
                    s.nf[cn.bid+'_'+cn.uid+'_'+cn.$bid]=setTimeout(function(q){
                        delete(s.cv[cn.uid][cn.$bid][cn.bid]);
                        s.tx({chxn:0,$bid:cn.$bid,uid:cn.uid,bid:cn.bid},cn.uid+'_'+cn.$bid);
                    },10000);
                }
                return false;
            }
            if(s.a[cn.uid]&&s.a[cn.uid][cn.id]){
                d.fn=function(xx){
                    Object.keys(s.a[xx][cn.id].joined).forEach(function(v){
                        Object.keys(s.a[xx][cn.id].joined[v]).forEach(function(b){
                            if(s.visitors[v]&&s.visitors[v][b]&&s.visitors[v][b].joined[xx]){
                                if(s.visitors[v][b].pj&&s.visitors[v][b].pj[xx]&&s.visitors[v][b].pj[xx][cn.bid]){s.visitors[v][b].pj[xx][cn.bid].te.push(s.moment())};
                                delete(s.visitors[v][b].joined[xx][cn.bid]);d.qq=s.visitors[v][b];
                                s.tx({cj:s.a[xx][cn.id].n,x:0,adm:{x:0,u:cn.uid,n:s.a[xx][cn.id],peer:s.a[xx][cn.id].peer,b:cn.bid},cap:d.qq.cap,pj:d.qq.pj,uid:v,bid:b},v+'_'+b)
                                atx({joined:d.qq.joined,uid:v,bid:b},v);
                            }
                        })
                    })
                    Object.keys(s.a[xx][cn.id].chh).forEach(function(v){
                        Object.keys(s.a[xx][cn.id].chh[v]).forEach(function(b){
                            if(s.channels[v]&&s.channels[v][b]){
                                delete(s.channels[v][b].j[xx+'_'+cn.bid]);
                                s.tx({chan:s.channels[v][b],uid:v,bid:b},v+'_'+b);
                            }
                        })
                    });s.a[xx][cn.id].status="0";
                    aatx({at:s.ad(s.a[xx][cn.id],cn.id),x:1,uid:cn.uid},xx)
                    delete(s.onlineOperators[xx][cn.id])
                    delete(s.a[xx][cn.id])
                    //s.log(xx,{id:cn.bid,ip:cn.ip,status:2});
                }
                d.fn(cn.uid);
                sql.query("SELECT shfr from Users where ke='"+cn.uid+"'",function(er,r,g){
                    if(er){return;}
                    r=JSON.parse(r[0].shfr);
                    if(r.length>0){
                        r.forEach(function(v){
                            d.fn(v);
                        })
                    }
                })
            }
            if(s.visitors[cn.uid]&&s.visitors[cn.uid][cn.bid]&&!(s.p[cn.uid]&&s.p[cn.uid][cn.id])){
                atx({f:'dii',d:cn.bid,uid:cn.uid,cn:cn.id},cn.uid)
                if(s.visitors[cn.uid][cn.bid].vid[cn.id]){delete(s.visitors[cn.uid][cn.bid].vid[cn.id])}
                if(s.visitors[cn.uid]&&s.visitors[cn.uid][cn.bid]&&s.visitors[cn.uid][cn.bid].brd&&Object.keys(s.visitors[cn.uid][cn.bid].vid).length===0){
                s.nf[cn.bid+'_'+cn.uid]=setTimeout(function(q){
                    if(s.visitors[cn.uid]&&s.visitors[cn.uid][cn.bid]&&s.visitors[cn.uid][cn.bid].vid){
                    atx({f:'li',bid:cn.bid,vid:s.visitors[cn.uid][cn.bid].vid,uid:cn.uid},cn.uid);
                    red.get("CHAT_"+cn.uid+"_"+cn.bid,function(err,rd){rd=s.jp(rd);
                    red.get("LOG_"+cn.uid+"_"+cn.bid,function(err,rlog){rlog=s.jp(rlog,[]);
                    //Breadcrumbs
                        q={rr:s.visitors[cn.uid][cn.bid]};if(rd){q.ch=rd}
                        q.time=q.rr.brd[0].time,q.qu="SELECT id FROM Crumbs WHERE id=? AND ke=? AND `start`=?",q.qa=[cn.bid,cn.uid,q.time];
                        sql.query(q.qu,q.qa,function(err,r){
                        q.j=q.rr.brd;if((q.j instanceof Array)===false){q.j=[]};q.j=JSON.stringify(q.j);
                        if(r&&r[0]){
                            q.qu="UPDATE Crumbs SET brd=? WHERE `start`=? AND id=? AND ke=?";
                            q.qa=[q.j,q.time,cn.bid,cn.uid]
                        }else{
                            q.qu="INSERT INTO Crumbs (id,ke,ip,brd,start) VALUES (?,?,?,?,?)";
                            q.qa=[cn.bid,cn.uid,cn.ip,q.j,q.time]
                        }
                        sql.query(q.qu,q.qa,function(){
                        if(q.ch&&q.ch[0]){q.time=q.ch[0].time}else{q.time=moment().utcOffset('-0800').format();}
                        q.user=JSON.stringify({name:q.rr.name,mail:q.rr.mail,ip:cn.ip,pj:q.rr.pj});
                        if(q.rr.cap==0&&q.rr.chat===1&&rd&&rd[0]&&rd.length>0){
                            q.qu="INSERT INTO Missed (start,id,ke,user) VALUES (?,?,?,?)";
                            q.qa=[q.time,cn.bid,cn.uid,q.user];atx({mhistory:rd,uid:cn.uid,bid:cn.bid,d:q.qa},cn.uid);
                            sql.query(q.qu,q.qa)
                        }
                        //Chats
                        q.qu="SELECT id FROM Chats WHERE id=? AND ke=? AND `start`=?";
                        q.qa=[cn.bid,cn.uid,q.time];
                            try{q.ar=JSON.stringify(q.ch)}catch(errr){q.ar='[]'}
                            if(q.ar&&q.ar!=='[]'&&q.ar!=='{}'){
                                sql.query(q.qu,q.qa,function(err,r){
                                    if(!q.rr.co){q.rr.co=1};q.co=q.rr.co;
                                    if(r&&r[0]){
                                        q.qu="UPDATE Chats SET history=?,user=? WHERE `start`=? AND id=? AND ke=?";
                                        q.qa=[q.ar,q.user,q.time,cn.bid,cn.uid];
                                    }else{
                                        q.qu="INSERT INTO Chats (start,history,id,ke,co,user) VALUES (?,?,?,?,?,?)";
                                        q.qa=[q.time,q.ar,cn.bid,cn.uid,q.co,q.user];
                                    }
                                    sql.query(q.qu,q.qa,function(){
                                        if(rlog.length>0){
                                    //Logs
                                        q.time=rlog[0].t;
                                        q.qu="SELECT id FROM Logs WHERE id=? AND ke=? AND `start`=?";
                                        q.qa=[cn.bid,cn.uid,q.time];
                                        try{q.ar=JSON.stringify(rlog)}catch(errr){q.ar='[]'}
                                        if(q.ar&&q.ar!=='[]'&&q.ar!=='{}'){
                                            sql.query(q.qu,q.qa,function(err,r){
                                                if(r&&r[0]){
                                                    q.qu="UPDATE Logs SET history=? WHERE `start`=? AND id=? AND ke=?";
                                                    q.qa=[q.ar,q.time,cn.bid,cn.uid];
                                                }else{
                                                    q.qu="INSERT INTO Logs (start,history,id,ke) VALUES (?,?,?,?)";
                                                    q.qa=[q.time,q.ar,cn.bid,cn.uid];
                                                }
                                                sql.query(q.qu,q.qa)
                                            })
                                        }
                                        red.del("LOG_"+cn.uid+"_"+cn.bid)
                                    //end logs
                                        }
                                    })
                                })
                            }
                            red.del("CHAT_"+cn.uid+"_"+cn.bid)
                            delete(s.visitors[cn.uid][cn.bid]);
                            })
                        })
                    })
                    })
                }
                },10000)
                }
            }
            if(cn.uuid&&s.p[cn.uuid]&&s.p[cn.uuid][cn.id]){
                delete(s.p[cn.uuid][cn.id])
                if(Object.keys(s.p[cn.uuid]).length===0){s.p[cn.uuid]}
            }
        }
    });
});

//main page
app.get('/', function (req,res){
    res.render('index');
});
//dashboard
app.get(['/dashboard','/dashboard/:ke'], function (req,res){
    req.proto=req.headers['x-forwarded-proto']||req.protocol;
    res.render('login',{data:req.params,$_GET:req.query,https:(req.proto==='https'),host:req.protocol+'://'+req.hostname,config:config});
});
//login and dashboard
app.post(['/dashboard','/dashboard/:ke'], function (req,res){
    req.ret={ok:false};
    req.proto=req.headers['x-forwarded-proto']||req.protocol;
    function send (x){
        if(x.success===true){
            x.sudo=function(c){
                switch(c){
                    case'su':
                if(x.session['Title']==='Superuser'){return true;}
                    break;
                    default:
                if(x.session['Title']==='Superuser'||x.session['Title']==='Operator'){return true;}
                    break;
                }
                return false;
            }
            x.data={};
            x.$user=x.session;
            x.config=config;
            x.host=req.proto+'://'+req.hostname;
            res.render('dashboard',x)
        }else{
            res.render('login',{data:{ke:x.ke},$_GET:req.query,https:(req.proto==='https'),host:req.proto+'://'+req.get('host'),config:config})
        }
    }
    function addtoSession(g,x){
        if(!req.stop){req.stop=1;}else{return}
        x={
            arr:{
                mas:g.M,
                id:g.id,
                ke:g.ke,
                auth:g.auth,
                uni:g.ke+g.id
            }
        }
        sql.query('SELECT * FROM Auth WHERE uni = ?',[x.arr.uni],function(err,r){
            if(r&&r[0]){
                sql.query('UPDATE Auth SET auth=? WHERE uni=?',[g.auth,x.arr.uni])
            }else{
                x.keys=Object.keys(x.arr);
                x.ques=[];
                x.vals=[];
                x.keys.forEach(function(v,n){
                    x.ques.push('?');
                    x.vals.push(x.arr[v]);
                });
                sql.query('INSERT INTO Auth ('+x.keys.join(',')+') VALUES ('+x.ques.join(',')+')',x.vals)
            }
            send(req.ret)
        })
    }
    req.body.user=req.body.user.toLowerCase().trim()
    if (req.body.user==='') {
        req.ret.msg = "Username field was empty.";
    } else if (req.body.pass==='') {
        req.ret.msg = "Password field was empty.";
    } else if (req.body.user!=='' && req.body.pass!=='') {
        req.where='';
        req.vals=[req.body.user,s.md5(req.body.pass)];
        if(req.body.ke&&req.body.ke!==''){
            req.where=' AND ke = ?';
            req.vals.push(req.body.ke);
        }
        sql.query('SELECT id,ke,mail,login,ref,name,shto,shfr,ops,ids,type FROM Users WHERE login = ? AND pass = ?'+req.where,req.vals,function(err,r){
            if(r&&r[0]){
                if(r.length>1){
                    req.ret.msg = "Please choose one of your Keys";
                    req.ret.pkg=r;
                    send(req.ret);
                }else if(r.length===1){//found master
                    r=r[0];
                    sql.query('SELECT * FROM API WHERE ke = ?',[r.ke],function(err,api){
                        sql.query('SELECT * FROM Details WHERE ke = ?',[r.ke],function(err,det){
                            req.ret.session={};
                            req.ret.success=true;
                            r.ids=JSON.parse(r.ids,true);
                            if(r.ids.pp){
                                req.ret.session.pp = r.ids.pp;
                            }
                            req.ret.session.M = 1;
                            req.ret.session.auth = s.gid(24);
                            req.ret.session.api = api;
                            req.ret.session.lv = r.type;
                            req.ret.session.id = r.id;
                            req.ret.session.ke = r.ke;
                            req.ret.session.ref = r.ref;
                            req.ret.session.mail = r.mail;
                            req.ret.session.login = r.login;
                            req.ret.session.name = r.name;
                            req.ret.session.Title='Superuser';
                            req.ret.session.shto = r.shto;
                            req.ret.session.shfr = r.shfr;
                            req.ret.session.ops= JSON.parse(r.ops,true);
                            req.ret.session.det=det;
                            req.ret.session.ids=r.ids;
                            if(!req.ret.session.det){req.ret.session.det='{}';}
                            addtoSession(req.ret.session);
                        })
                    })
                }else if(r.length===0){//no master
                    if(req.body.ke&&req.body.ke!==''){//key is set
                    sql.query('SELECT * FROM Details WHERE ke = ? AND subs LIKE ? AND subs LIKE ?',[req.body.ke,'%"Username":"'+req.body.user+'"%','%"Password":"'+req.body.pass+'"%'],function(err,row){
                        if(r&&r[0]){
                            r=r[0];
                            r.subs=JSON.parse(r.subs,true);
                            Object.keys(r.subs).forEach(function(v,n){//sift sub accounts
                                if(v.Username.toLowerCase()===req.body.user&&v.Password===req.body.pass){
                                    r=v;
                                }
                            })
                            sql.query('SELECT * FROM Users WHERE ke = ?',[r.ke],function(err,ops){
                                ops=ops[0];
                                req.ret.session={};
                                req.ret.ret.success=true;
                                req.ret.session.M = 0;
                                req.ret.session.lv = ops.type;
                                req.ret.session.pp = r.PP;
                                req.ret.session.id = r.Id;
                                req.ret.session.auth = s.gid(24);
                                req.ret.session.ke = req.body.ke;
                                req.ret.session.name = r.Name;
                                req.ret.session.mail = r.Username;
                                req.ret.session.Title = r.Title;
                                req.ret.session.shto = '[]';
                                req.ret.session.shfr = '[]';
                                req.ret.session.ops = '{}';
                                req.ret.session.det = r;

                                if(!req.ret.session.ids){
                                    req.ret.session.ids={};
                                }
                                Object.keys(r).forEach(function(v,n){
                                    if(v.indexOf('slack')>-1){
                                        req.ret.session.ids[v]=r[n];
                                    }
                                })                        
                                if(r.Title==='Superuser'){
                                    sql.query('SELECT * FROM API WHERE ke = ?',[r.ke],function(err,api){
                                        req.ret.session.ids=JSON.parse(ops.ids,true);
                                        req.ret.session.api = api;
                                        addtoSession(req.ret.session);
                                    })
                                }else if(r.Title==='Operator'||r.Title==='Superuser'){
                                    req.ret.session.ops = JSON.parse(ops.ops,true);
                                    addtoSession(req.ret.session);
                                }
                            })
                        }else{
                            req.ret.msg = "Credentials Incorrect.";
                            send(req.ret)
                        }
                    })
                    }else{
                        req.ret.msg = "Password incorrect, or Account does not exist.";
                        send(req.ret)
                    }
                }
            }else{
                req.ret.test = req.body;
                req.ret.msg = "Password incorrect, or Account does not exist.";
                send(req.ret)
            }
        })
    }
});
//get unsecured
app.all(['/get/:stuff','/get/:stuff/:f','/get/:stuff/:f/:ff','/get/:stuff/:f/:ff/:fff','/get/:stuff/:f/:ff/:fff/:ffff'],function (req,res){
    res.setHeader('Content-Type','application/json');
    req.ret={ok:false}
    switch(req.params.stuff){
        case'translation':
            req.url='https://translate.yandex.net/api/v1.5/tr.json/translate?key=trnsl.1.1.20160311T042953Z.341f2f63f38bdac6.c7e5c01fff7f57160141021ca61b60e36ff4d379&text='+req.body.t+'&lang='+req.body.fr+'-'+req.body.to;
            request({url:req.url,method:'GET',encoding:'utf8'},function(err,data){
                req.ret.ok=true;
                req.ret.text=JSON.parse(data.body)['text'][0];
                res.end(JSON.stringify(req.ret,null,3));
            })
        break;
    }
})
//get secured
app.all(['/:api/:ke/get/:stuff','/:api/:ke/get/:stuff/:f','/:api/:ke/get/:stuff/:f/:ff','/:api/:ke/get/:stuff/:f/:ff/:fff','/:api/:ke/get/:stuff/:f/:ff/:fff/:ffff'],function (req,res){
    res.setHeader('Content-Type','application/json');
    req.ret={ok:false}
    switch(req.params.stuff){
        case'onlineVisitors':
            req.cities={}
            req.countries={}
            req.newArray=Object.values(s.cloneObject(s.visitors[req.params.ke]))
            req.newArray.forEach(function(v){
                delete(v.ip)
                //city group
                if(v.geo){
                    delete(v.geo.ip)
                    if(!req.cities[v.geo.city]){
                        req.cities[v.geo.city]=[]
                    }
                    //country group
                    if(!req.countries[v.geo.country_code]){
                        req.countries[v.geo.country_code]=[]
                    }
                    req.cities[v.geo.city].push(v)
                    req.countries[v.geo.country_code].push(v)
                }else{
                    if(!req.cities.unknown){
                        req.cities.unknown=[]
                    }
                    //country group
                    if(!req.countries.unknown){
                        req.countries.unknown=[]
                    }
                    req.cities.unknown.push(v)
                    req.countries.unknown.push(v)
                }
            })
            res.end(s.s({users:req.newArray,cities:req.cities,countries:req.countries,usersCount:req.newArray.length,countriesCount:s.objectCount(req.countries),citiesCount:s.objectCount(req.cities)},null,3))
        break;
        case'missed':
            req.vals=[req.params.ke];
            req.query='';
            if(req.params.ff&&req.params.ff!==''){req.query+='AND start=? ';req.vals.push(decodeURIComponent(req.params.ff));}
            if(req.params.fff&&req.params.fff!==''){req.query+='AND end=? ';req.vals.push(decodeURIComponent(req.params.fff));}
            sql.query('SELECT * FROM Missed WHERE ke=? '+req.query+'ORDER BY start ASC LIMIT 20',req.vals,function(err,r){
                req.ret.ok=true;
                req.ret.missed=r;
                res.end(JSON.stringify(req.ret,null,3));
            })
        break;
        case'chat':
            if(!req.body.limit){req.body.limit='LIMIT 1';}else{req.body.limit='LIMIT '+req.body.limit}
            if(req.params.ff){
                req.vals=[req.params.ke,req.params.f,decodeURIComponent(req.params.ff)];
                sql.query('SELECT * FROM Chats WHERE ke=? AND id=? AND start >= DATE(?) ORDER BY start DESC '+req.body.limit,req.vals,function(err,r){
                    sql.query('SELECT * FROM Crumbs WHERE ke=? AND id=? AND start >= DATE(?) ORDER BY start DESC '+req.body.limit,req.vals,function(err,rr){
                        req.ret.ok=true,
                        req.ret.chat=r,
                        req.ret.crumbs=rr;
                        res.end(JSON.stringify(req.ret,null,3));
                    })
                })
            }else{
                req.vals=[req.params.ke,req.params.f];
                if(req.params.ff&&req.params.ff!==''){
                    req.body.limit='AND start=? '+req.body.limit;
                    req.vals.push(decodeURIComponent(req.params.ff));
                }
                sql.query('SELECT * FROM Chats WHERE ke=? AND id=? '+req.body.limit,req.vals,function(err,r){
                    sql.query('SELECT * FROM Crumbs WHERE ke=? AND id=? '+req.body.limit,req.vals,function(err,rr){
                        req.ret.ok=true,
                        req.ret.chat=r,
                        req.ret.crumbs=rr;
                        res.end(JSON.stringify(req.ret,null,3));
                    })
                })
            }
        break;
        case'recs':
            if(req.params.ff){
               req.ret={ok:false,msg:'File not found'}
               req.file=__dirname+'/../rec/'+req.params.ke+'/'+req.params.ff+'/'+'.json';
                if(fs.existSync(req.file)){
                    res.end(fs.readFileSync(req.file,'UTF8'));
                }else{
                    res.end(JSON.stringify(req.ret,null,3));
                }
            }else{
                sql.query('SELECT * FROM Recordings WHERE ke=?',[req.params.ke],function(err,r){
                    if(err){
                        req.ret=err;
                    }else{
                        req.ret=r;
                    }
                    res.end(JSON.stringify(req.ret,null,3));
                })
            }
        break;
    }
});
//contact form
app.post('/contact/:ke', function (req,res){
    res.header("Access-Control-Allow-Origin",req.headers.origin);
    res.setHeader('Content-Type', 'application/json');
    req.complete=function(data){
        res.end(s.s(data, null, 3))
    }
    sql.query('SELECT ke,mail FROM Users WHERE ke=?',[req.params.ke],function(err,r){
        if(r&&r[0]){
            r=r[0]
            req.mailOptions = {
                from: '"Emissary" <no-reply@emissary.chat>',
                to: r.mail,
                subject: "New Message - Unmetered.Chat",
                html: '',
            };
            req.mailOptions.html +='<table cellspacing="0" cellpadding="0" border="0" style="background-color:#3598dc" bgcolor="#3598dc" width="100%"><tbody><tr><td valign="top" align="center">';
            req.mailOptions.html += "<table cellspacing='0' cellpadding='0' border='0' style='border-radius:5px;margin-top:30px;margin-bottom:50px;overflow: hidden;' width='650'>";
            req.mailOptions.html +="<tbody><tr><td style='font-family:&quot;Myriad Pro&quot;,Arial,Helvetica,sans-serif;line-height:1.6;font-size:14px;color:#4a4a4a;background-color:#f6f6f6;border-bottom:1px solid #f0f0f0' align='center' bgcolor='#f6f6f6' height='64' valign='middle'><img src='https://unmetered.chat/logos/title.png'></td></tr><tr>";
            req.mailOptions.html +='<td style="background:#fff;padding:30px;">';
            req.mailOptions.html +="<p>While you were away from <b>Unmetered.Chat</b> you recieved this message.</p>";
            req.mailOptions.html +='<div style="display:block;border-radius:4px;word-break:break-all;word-wrap:break-word;padding:9.5px;margin:0 0 10px;font-size:12px;line-height:1.42857143;background-color:#f5f5f5;border:1px solid #ccc;color:grey" bgcolor="#f5f5f5">';
            req.mailOptions.html +=req.body.msg;
            req.mailOptions.html +='</div><small style="display:block;margin-bottom:10px">'+req.body.name+" - <a href='mailto:"+req.body.mail+"'>"+req.body.mail+'</a></small><br><a href="mailto:'+req.body.mail+'" style="display: inline-block;border-radius:5px;word-break:break-all;word-wrap:break-word;padding:9.5px;margin:0 0 10px;font-size:12px;line-height:1.42857143;text-decoration: none;background-color: #3598DC;border: 1px solid #3598DC;color: white;">Reply</a></td>';
            req.mailOptions.html +="</tr>";
            req.mailOptions.html +="</tbody></table>";
            req.mailOptions.html +="</td></tr>";
            req.mailOptions.html +="</tbody>";
            nodemailer.sendMail(req.mailOptions, (error, info) => {
                if (error) {
                    req.complete({ok:false,msg:error})
                    console.log(error)
                    return ;
                }
                req.complete({ok:true})
            });
        }else{
            req.complete({ok:false,msg:'Key does not exist'})
        }
    })
});
//rating operator chat form
app.post('/rating/:ke', function (req,res){
    res.header("Access-Control-Allow-Origin",req.headers.origin);
    res.setHeader('Content-Type', 'application/json');
    req.complete=function(data){
        res.end(s.s(data, null, 3))
    }
    sql.query('SELECT ke,mail,ids FROM Users WHERE ke=?',[req.params.ke],function(err,r){
        if(r&&r[0]){
            r=r[0]
            req.ry=JSON.stringify(r['ids'])['ry'];
            req.body.user=JSON.parse(req.body.user)
            req.next=function(){
                req.mail=JSON.parse(req.body.rate).wylac
                req.chat=JSON.parse(req.body.chat)
                if(req.mail!==''&&s.validateEmail(req.mail)&&req.chat.length>0){
                    req.mailOptions = {
                        from: '"Emissary" <no-reply@emissary.chat>',
                        to: req.mail,
                        subject: "Chat History - Unmetered.Chat",
                        html: '',
                    };
                    req.mailOptions.html +='<table cellspacing="0" cellpadding="0" border="0" style="background-color:#3598dc" bgcolor="#3598dc" width="100%"><tbody><tr><td valign="top" align="center">';
                    req.mailOptions.html += "<table cellspacing='0' cellpadding='0' border='0' style='border-radius:5px;margin-top:30px;margin-bottom:30px;overflow: hidden;' width='650'>";
                    req.mailOptions.html +="<thead><tr style='font-weight:bold;color:#fff'><td style='padding:6px'>Time</td><td style='padding:6px'>Name</td><td style='padding:6px'>Message</td></tr></thead><tbody>";
                    req.chat.forEach(function(v){
                        req.mailOptions.html +="<tr style='color:#fff;border-bottom:1px solid #fff'><td style='padding:6px'>"+v.time+"</td><td style='padding:6px'>"+v.name+"</td><td style='padding:6px'>"+v.text+"</td></tr>";
                    })
                    req.mailOptions.html +="</tbody></table>";
                    req.mailOptions.html +="</table>";
                    nodemailer.sendMail(req.mailOptions, (error, info) => {
                        if (error) {
                            req.complete({ok:false,msg:error})
                            console.log(error)
                            return ;
                        }

                    });
                }
                delete(req.body.chat);
                req.body.ke=req.params.ke;
                req.body.ip=req.headers['cf-connecting-ip']||req.headers["CF-Connecting-IP"]||req.headers["'x-forwarded-for"]||req.connection.remoteAddress;
                req.body.user=JSON.stringify(req.body.user);
                req.InsertKeys=Object.keys(req.body)
                req.questions=[]
                req.InsertKeys.forEach(function(){
                    req.questions.push('?')
                })
                sql.query('INSERT INTO Ratings ('+req.InsertKeys.join(',')+') VALUES ('+req.questions.join(',')+')',Object.values(req.body))
                req.complete({ok:true})
            }
            if(req.ry&&req.ry!=='d'){
                sql.query('SELECT rates FROM Details WHERE ke=?',[req.params.ke],function(err,rr){
                    if(rr&&rr[0]){
                        rr=rr[0]
                        req.ry=JSON.parse(rr['rates']).shift();
                        req.yr={}
                        req.ry.forEach(function(v,n){
                            delete(v.d);
                            delete(v.fa);
                            req.yr[n]=v;
                        })
                        delete(req.yr['wylac']);
                        req.body.user.rule=req.yr;
                        req.next()
                    }
                })
            }else{
                req.next()
            }
        }else{
            req.complete({ok:false,msg:'Key does not exist'})
        }
    })
});
//
app.post(['/mail'], function(req,res,e) {
    res.render('mail');
})
//
app.all(['/api/:id/:type','/api/:id/:type/:var'], function(req,res,e) {
    e.origin = req.headers.origin;
    res.header("Access-Control-Allow-Origin",e.origin);
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
    sql.query('SELECT ke,detail FROM API WHERE code=?',[req.params.id],function(err,r){
        if(r&&r[0]){
            r=r[0];r.detail=JSON.parse(r.detail);e={ip:(req.headers['cf-connecting-ip']||req.headers["CF-Connecting-IP"]||req.headers["'x-forwarded-for"]||req.connection.remoteAddress)};
            if(req.body.data){req.body=JSON.parse(req.body.data)}
            
//            if(r.detail.origins&&r.detail.origins.length>3){
//                e.t=0;
//                r.detail.origins.split(',').forEach(function(v){
//                    if(e.origin.indexOf(v)>-1){e.t=1;}
//                });
//                if(e.t===0){res.end({ok:false,msg:'Unauthorized Domain'});return false;}
//            }
            switch(req.params.type){
                case'logs':
                    if(req.params.var){e.st="LOG_"+r.ke+"_"+req.params.var;}else{e.st="LOG_"+r.ke;}
                    red.get(e.st,function(err,rd){
                        rd=s.jp(rd,[]);res.end({ok:true,logs:rd});
                    })
                break;
                case'data':
                    try{req.body=JSON.parse(req.body)}catch(err){}
                    if(req.body.data){req.body=req.body.data=JSON.parse(req.body.data)}
                    e.a={hook:req.body,uri:'cx',uid:r.ke,time:s.moment()};e.a.ip=e.ip;
                    if(req.body.id){e.a.hook.id=req.body.id;}
                    atx(e.a,r.ke);
                    if(req.body.time===1){req.body.time=e.a.time}
                    if(req.body.stor){
                        if(req.body.stor.get){
                            ree.get('CVAL_'+r.ke,function(er,rd){rd=s.jp(rd);
                                tx({stor:{key:req.body.stor.get,value:rd[req.body.stor.get]}});
                            })
                        }
                        if(req.body.stor.put&&req.body.stor.value){
                            switch(req.body.stor.value){
                                case'/time':
                                    req.body.stor.value=e.a.time;
                                break;
                            }
                            ree.get('CVAL_'+r.ke,function(er,rd){rd=s.jp(rd);
                                rd[req.body.stor.put]=req.body.stor.value;
                                s.stt("CVAL_"+r.ke,s.js(rd));
                            })
                        }
                    }
                    if(req.body.broadcast===1){s.tx(e.a,r.ke);}
                    if(req.body.log){
                        try{req.body.log=JSON.parse(req.body.log);}catch(err){}
                        if(!req.body.log||(req.body.log instanceof Object)===false){req.body.log={}}
                        if(req.body.note&&req.body.log.text==='/note'){req.body.log.note=1;req.body.log.text=req.body.note;}
                        if(!req.body.log.c){req.body.log.c=1}
                        req.body.log.ip=e.ip,req.body.log.origin='cx';
                        s.log(r.ke,req.body.log);
                        if(e.a.hook.id){s.log(r.ke,req.body.log,e.a.hook.id);}
                    }
                    res.end(e.s);
                break;
                case'app':
                    
                break;
                default:
                    s.log(r.ke,{c:18,ip:e.ip,origin:e.origin});
                    res.end({ok:false,msg:'Invalid API'});
                break;
            }
            
        }else{
            res.end({ok:false,msg:'no key found'});
        }
    })
});
//embed
app.get('/embed/:ke', function (req,res){
    req.proto=req.headers['x-forwarded-proto']||req.protocol;
    res.header("Access-Control-Allow-Origin",req.headers.origin);
    res.render('embed',{data:req.params,$_GET:req.query,https:(req.proto==='https'),host:req.protocol+'://'+req.hostname,config:config,clientIP:s.getClientIPthroughCloudFlare(req)});
});