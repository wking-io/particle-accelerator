module Main exposing (main)

import AnimationFrame
import Canvas
import Color exposing (Color)
import Html exposing (Html)
import Html.Attributes as Attributes
import Json.Decode as Decode exposing (Decoder, Value)
import Random exposing (Generator, Seed)
import Time exposing (Time)


main : Program Value Model Msg
main =
    Html.programWithFlags
        { init = init
        , view = view
        , update = update
        , subscriptions =
            \_ -> AnimationFrame.times Tick
        }



-- MODEL #############################################################


type Model
    = Running Time Seed Canvas (List Particle)


type alias Canvas =
    { width : Int
    , height : Int
    }


type alias Particle =
    { origin : Point
    , cx : Float
    , cy : Float
    , vx : Float
    , vy : Float
    , radius : Float
    , maxRadius : Float
    , color : Color
    , speed : Float
    , gravity : Float
    , duration : Float
    , friction : Float
    , dying : Bool
    , rotation : Float
    }


type alias Triangle =
    ( Point, Point, Point )


type alias Point =
    ( Float, Float )



-- ( duration, speed )


type alias Step =
    ( Float, Float )


init : Value -> ( Model, Cmd Msg )
init json =
    let
        ( canvas, points ) =
            Decode.decodeValue flagDecoder json
                |> Result.withDefault ( { width = 0, height = 0 }, [] )

        ( particles, seed ) =
            List.map initParticleAt points
                |> updateAllParticles (updateParticle True ( 4, 0.05 ) canvas) (Random.initialSeed 0)
    in
        ( Running 0 seed canvas particles
        , Cmd.none
        )


initParticleAt : Point -> Particle
initParticleAt ( x, y ) =
    { origin = ( x, y )
    , cx = x
    , cy = y
    , vx = 0
    , vy = 0
    , radius = 1
    , maxRadius = 6
    , color = Color.blue
    , speed = 4
    , gravity = 0
    , duration = 0.05
    , friction = 0.99
    , dying = False
    , rotation = 0
    }



-- VIEW ##############################################################


view : Model -> Html Msg
view model =
    case model of
        Running initTime seed canvas particles ->
            Canvas.element
                canvas.width
                canvas.height
                [ Attributes.style [ ( "background-image", "linear-gradient(135deg, #38BAA0, #D5ED9A)" ) ] ]
                [ Canvas.clearRect 0 0 (toFloat canvas.width) (toFloat canvas.height)
                , Canvas.batch (List.map viewParticle particles)
                ]


viewParticle : Particle -> Canvas.Command
viewParticle particle =
    let
        ( ( ax, ay ), ( bx, by ), ( cx, cy ) ) =
            particle
                |> fromParticle
                |> rotateTriangle particle.rotation particle.origin
    in
        Canvas.batch
            [ Canvas.strokeStyle (Color.white)
            , Canvas.beginPath
            , Canvas.moveTo ax ay
            , Canvas.lineTo bx by
            , Canvas.lineTo cx cy
            , Canvas.closePath
            , Canvas.stroke
            ]



-- UPDATE ############################################################


type Msg
    = Tick Time


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case ( msg, model ) of
        ( Tick currentTime, Running initTime seed canvas particles ) ->
            let
                forceReset =
                    False

                timeline =
                    getTimeline 10000 initTime currentTime

                time =
                    if initTime == 0 then
                        currentTime
                    else
                        initTime

                ( newParticles, newSeed ) =
                    updateAllParticles (updateParticle False timeline canvas) seed particles
            in
                ( Running time newSeed canvas newParticles, Cmd.none )


getTimeline : Float -> Time -> Time -> ( Float, Float )
getTimeline delay initTime currentTime =
    let
        diff =
            (Time.inMilliseconds currentTime) - (Time.inMilliseconds initTime)
    in
        if initTime == 0 then
            ( 4, 0.05 )
        else if diff > (delay + 450) then
            ( 0, 0.25 )
        else if diff > (delay + 400) then
            ( 1, 0.2 )
        else if diff > (delay + 300) then
            ( 2, 0.15 )
        else if diff > (delay + 200) then
            ( 3, 0.1 )
        else
            ( 4, 0.05 )


updateAllParticles : (Seed -> Particle -> ( Particle, Seed )) -> Seed -> List Particle -> ( List Particle, Seed )
updateAllParticles step seed particles =
    List.foldr (stepAccum step) ( [], seed ) particles


stepAccum : (Seed -> Particle -> ( Particle, Seed )) -> Particle -> ( List Particle, Seed ) -> ( List Particle, Seed )
stepAccum step particle ( list, seed ) =
    let
        ( newParticle, newSeed ) =
            step seed particle
    in
        ( newParticle :: list, newSeed )


updateParticle : Bool -> ( Float, Float ) -> Canvas -> Seed -> Particle -> ( Particle, Seed )
updateParticle forceReset ( speed, duration ) canvas seed particle =
    if forceReset || particle.radius < 1 then
        Random.step particleVariablesGenerator seed
            |> Tuple.mapFirst (resetParticle speed duration particle)
    else
        let
            radiusGrowth =
                if particle.dying then
                    -particle.duration
                else
                    particle.duration

            newRadius =
                particle.radius + radiusGrowth
        in
            ( { particle
                | cx = particle.cx + particle.vx
                , cy = particle.cy + particle.vy
                , vx = particle.vx * particle.friction
                , vy = (particle.vy + particle.gravity) * particle.friction
                , radius = newRadius
                , dying = particle.dying || newRadius > particle.maxRadius
                , rotation = particle.rotation + 2
                , speed = speed
                , duration = duration
              }
            , seed
            )


resetParticle : Float -> Float -> Particle -> ParticleVariables -> Particle
resetParticle speed duration particle ( maxRadius, color, angle ) =
    updateVelocity angle
        { particle
            | maxRadius = maxRadius
            , color = color
            , radius = 1
            , dying = False
            , rotation = angle
            , speed = speed
            , duration = duration
            , cx = Tuple.first particle.origin
            , cy = Tuple.second particle.origin
        }



-- DECODERS ##########################################################


flagDecoder : Decoder ( Canvas, List Point )
flagDecoder =
    Decode.map2 (,)
        (Decode.field "size" sizeDecoder)
        (Decode.field "points" (Decode.list pointDecoder))


sizeDecoder : Decoder Canvas
sizeDecoder =
    Decode.map2 Canvas
        (Decode.field "width" Decode.int)
        (Decode.field "height" Decode.int)


pointDecoder : Decoder Point
pointDecoder =
    Decode.map pointFromList (Decode.list Decode.float)


pointFromList : List Float -> Point
pointFromList list =
    case list of
        [ x, y ] ->
            ( x, y )

        _ ->
            ( 0, 0 )



-- GENERATORS ########################################################


{-| ( maxRadius, color, (vx, vy))
-}
type alias ParticleVariables =
    ( Float, Color, Float )


particleVariablesGenerator : Generator ParticleVariables
particleVariablesGenerator =
    Random.map3 (,,)
        maxRadiusGenerator
        colorGenerator
        angleGenerator


angleGenerator : Generator Float
angleGenerator =
    Random.float (degrees 0) (degrees 360)


maxRadiusGenerator : Generator Float
maxRadiusGenerator =
    Random.float 2 6


colorGenerator : Generator Color
colorGenerator =
    Random.map (pickColor possibleColors) (Random.int 0 4)


possibleColors : List Color
possibleColors =
    [ Color.rgb 0 48 73
    , Color.rgb 73 214 40
    , Color.rgb 247 127 0
    , Color.rgb 252 191 73
    , Color.rgb 234 226 183
    ]


pickColor : List Color -> Int -> Color
pickColor colors n =
    case ( colors, n ) of
        ( firstColor :: otherColors, 0 ) ->
            firstColor

        ( _ :: otherColors, n ) ->
            pickColor otherColors (n - 1)

        _ ->
            defaultColor


defaultColor : Color
defaultColor =
    Color.rgb 252 191 73



-- POINT ########################################################


rotateBy : Float -> Point -> Point
rotateBy angle ( x, y ) =
    let
        cosine =
            cos angle

        sine =
            sin angle
    in
        ( x * cosine - y * sine, y * cosine + x * sine )


translateBy : Point -> Point -> Point
translateBy ( vx, vy ) ( px, py ) =
    ( px + vx, py + vy )


vectorFrom : Point -> Point -> Point
vectorFrom ( x1, y1 ) ( x2, y2 ) =
    ( x2 - x1, y2 - y1 )


addTo : Point -> Point -> Point
addTo ( px, py ) ( vx, vy ) =
    ( px + vx, py + vy )


rotateAround : Float -> Point -> Point -> Point
rotateAround angle center =
    vectorFrom center >> rotateBy angle >> addTo center



-- TRIANGLE ########################################################


mapVertices : (Point -> Point) -> Triangle -> Triangle
mapVertices function ( p1, p2, p3 ) =
    ( function p1, function p2, function p3 )


rotateTriangle : Float -> Point -> Triangle -> Triangle
rotateTriangle angle origin =
    mapVertices (rotateAround angle origin)


fromParticle : Particle -> Triangle
fromParticle particle =
    let
        a =
            ( 0 * particle.radius + particle.cx, -1 * particle.radius + particle.cy )

        b =
            ( 0.866 * particle.radius + particle.cx, 0.5 * particle.radius + particle.cy )

        c =
            ( -0.866 * particle.radius + particle.cx, 0.5 * particle.radius + particle.cy )
    in
        ( a, b, c )



-- PARTICLE ########################################################


updateSpeed : Particle -> Particle
updateSpeed particle =
    let
        heading =
            atan2 particle.vx particle.vy
    in
        { particle
            | vx = cos heading * particle.speed
            , vy = sin heading * particle.speed
        }


updateHeading : Float -> Particle -> Particle
updateHeading heading particle =
    let
        speed =
            sqrt (particle.vx * particle.vx + particle.vy * particle.vy)
    in
        { particle
            | vx = cos heading * speed
            , vy = sin heading * speed
        }


updateVelocity : Float -> Particle -> Particle
updateVelocity angle particle =
    particle
        |> updateSpeed
        |> updateHeading angle
