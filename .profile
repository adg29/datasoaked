export IG_APP_PORT="4567"
export IG_CALLBACK_HOST="http://galan.fwd.wf"
export WHO_CALLBACK_HOST="http://datasoaked.herokuapp.com"
# export IG_CLIENT_ID="fbc600c2d36d4c5dae64ae9a275ba612"
# export IG_CLIENT_SECRET="a8ab4b3ef5bc4486b04a4fa97b9ac6cb"
export IG_CLIENT_ID="dcae1c9bbef5439fa64836255e81d108"
export IG_CLIENT_SECRET="1ca6fd3939964f6d82668d504201242d"
alias sub_delete='curl -X DELETE  "https://api.instagram.com/v1/subscriptions?object=all&client_id=$IG_CLIENT_ID&client_secret=$IG_CLIENT_SECRET"'
alias sub_list='curl "https://api.instagram.com/v1/subscriptions?client_id=$IG_CLIENT_ID&client_secret=$IG_CLIENT_SECRET"'


alias sub_sxswwhat='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=SXSWhathappenedlastnight"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/SXSWhathappenedlastnight/"      https://api.instagram.com/v1/subscriptions/'
alias sub_sxsw='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=sxsw"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/sxsw/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armorydream='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armorydreampiece"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/armorydreampiece/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armoryshow='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armoryshow"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/armoryshow/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armoryshow2014='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armoryshow2014"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/armoryshow2014/"      https://api.instagram.com/v1/subscriptions/'
alias sub_tbt='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=tbt"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/tbt/"      https://api.instagram.com/v1/subscriptions/'
alias sub_ootd='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=ootd"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/ootd/"      https://api.instagram.com/v1/subscriptions/'
alias sub_sunset='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=sunset"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/sunset/"      https://api.instagram.com/v1/subscriptions/'
alias sub_happyhour='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=happyhour"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/happyhour/"      https://api.instagram.com/v1/subscriptions/'
alias sub_dinner='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=dinner"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/dinner/"      https://api.instagram.com/v1/subscriptions/'
alias sub_kitty='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=kitty"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/kitty/"      https://api.instagram.com/v1/subscriptions/'
alias sub_goodnight='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=goodnight"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/goodnight/"      https://api.instagram.com/v1/subscriptions/'
alias sub_goodmorning='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=goodmorning"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/goodmorning/"      https://api.instagram.com/v1/subscriptions/'
alias sub_nyc='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=nyc"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/nyc/"      https://api.instagram.com/v1/subscriptions/'
alias sub_me='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=me"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/me/"      https://api.instagram.com/v1/subscriptions/'
alias sub_art='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=art"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/art/"      https://api.instagram.com/v1/subscriptions/'
alias sub_love='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=love"      -F "callback_url=$IG_CALLBACK_HOST/callbacks/tag/love/"      https://api.instagram.com/v1/subscriptions/'


alias sub_nyc_geo='curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.730869"          -F "lng=-73.994057"          -F "radius=5000"          -F "callback_url=$IG_CALLBACK_HOST/callbacks/geo/new-york-city/"          https://api.instagram.com/v1/subscriptions'
alias sub_tsquare_geo='curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.759334"          -F "lng=-73.984444"          -F "radius=5000"          -F "callback_url=$IG_CALLBACK_HOST/callbacks/geo/times-square/"          https://api.instagram.com/v1/subscriptions'
alias sub_willy_geo='curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.717631"          -F "lng=-73.958631"          -F "radius=5000"          -F "callback_url=$IG_CALLBACK_HOST/callbacks/geo/new-york-city/"          https://api.instagram.com/v1/subscriptions'
alias sub_alley_geo='curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.762211"          -F "lng=-73.982642"          -F "radius=5000"          -F "callback_url=$IG_CALLBACK_HOST/callbacks/geo/new-york-city/"          https://api.instagram.com/v1/subscriptions'

alias sub_all='sub_ootd && sub_dinner && sub_kitty && sub_goodnight && sub_goodmorning && sub_nyc && sub_me && sub_art && sub_love && sub_sunset && sub_happyhour'
alias sub_all_geo='sub_nyc_geo && sub_willy_geo && sub_tsquare_geo'

alias sub_delete_who='curl -X DELETE  "https://api.instagram.com/v1/subscriptions?object=all&client_id=$IG_CLIENT_ID&client_secret=$IG_CLIENT_SECRET"'
alias sub_list_who='curl "https://api.instagram.com/v1/subscriptions?client_id=$IG_CLIENT_ID&client_secret=$IG_CLIENT_SECRET"'
alias sub_willy_geo_who='heroku run curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.717631"          -F "lng=-73.958631"          -F "radius=5000"          -F "callback_url=$WHO_CALLBACK_HOST/callbacks/geo/new-york-city/"          https://api.instagram.com/v1/subscriptions'
alias sub_alley_geo_who='heroku run curl -F "client_id=$IG_CLIENT_ID"          -F "client_secret=$IG_CLIENT_SECRET"        -F "object=geography"         -F "aspect=media"          -F "lat=40.762211"          -F "lng=-73.982642"          -F "radius=5000"          -F "callback_url=$WHO_CALLBACK_HOST/callbacks/geo/new-york-city/"          https://api.instagram.com/v1/subscriptions'

alias sub_love_who='heroku run curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=love"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/love/"      https://api.instagram.com/v1/subscriptions/'
alias sub_nyc_who='heroku run curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=nyc"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/nyc/"      https://api.instagram.com/v1/subscriptions/'
alias sub_ootd_who='heroku run curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=ootd"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/ootd/"      https://api.instagram.com/v1/subscriptions/'
alias sub_rainroom_who='heroku run curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=rainroom"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/rainroom/"      https://api.instagram.com/v1/subscriptions/'

alias sub_sxsw_who='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=sxsw"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/sxsw/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armorydream_who='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armorydreampiece"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/armorydreampiece/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armoryshow_who='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armoryshow"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/armoryshow/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armoryshow14_who='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armoryshow14"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/armoryshow14/"      https://api.instagram.com/v1/subscriptions/'
alias sub_armoryshow2014_who='curl -F "client_id=$IG_CLIENT_ID"      -F "client_secret=$IG_CLIENT_SECRET"      -F "object=tag"      -F "aspect=media"      -F "object_id=armoryshow2014"      -F "callback_url=$WHO_CALLBACK_HOST/callbacks/tag/armoryshow2014/"      https://api.instagram.com/v1/subscriptions/'

export PATH="~/Code/utilities:$PATH"
