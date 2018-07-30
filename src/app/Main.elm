module Main exposing (main)

import AnimationFrame
import Color exposing (Color)
import Color.Convert exposing (colorToHex)
import Html exposing (Html)
import Json.Decode as Decode exposing (Decoder, Value)
import Process
import Random exposing (Generator, Seed)
import Svg exposing (Svg)
import Svg.Attributes as SA
import Task
import Time exposing (Time)


main : Program Value Model Msg
main =
    Html.programWithFlags
        { init = init
        , view = view
        , update = update
        , subscriptions =
            \model ->
                case model of
                    Stopped ->
                        Sub.none

                    Running _ _ _ ->
                        AnimationFrame.diffs Tick
        }



-- MODEL #############################################################


type Model
    = Running Seed Canvas (List Particle)
    | Stopped


type alias Canvas =
    { width : Int
    , height : Int
    }


type alias Particle =
    { origin : ( Float, Float )
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
    }


type alias Triangle =
    { vertices : ( Point, Point, Point )
    , color : Color
    , origin : Point
    }


type alias Point =
    ( Int, Int )


init : Value -> ( Model, Cmd Msg )
init json =
    let
        ( canvas, points ) =
            Decode.decodeValue flagDecoder json
                |> Result.withDefault ( { width = 0, height = 0 }, [] )

        _ =
            Debug.log "nb points" (List.length points)

        ( particles, seed ) =
            List.map initParticleAt points
                |> updateAllParticles (updateParticle True canvas) (Random.initialSeed 0)

        _ =
            Debug.log "nb particles" (List.length particles)
    in
        ( Running seed canvas particles
        , stopAfter (30 * Time.second)
        )


initParticleAt : Point -> Particle
initParticleAt ( x, y ) =
    { origin = ( toFloat x, toFloat y )
    , cx = toFloat x
    , cy = toFloat y
    , vx = 0
    , vy = 0
    , radius = 1
    , maxRadius = 5
    , color = Color.blue
    , speed = 0
    , gravity = 0
    , duration = 0.4
    , friction = 0.99
    , dying = False
    }


stopAfter : Time -> Cmd Msg
stopAfter duration =
    Process.sleep duration
        |> Task.perform (always Stop)



-- VIEW ##############################################################


view : Model -> Html Msg
view model =
    case model of
        Stopped ->
            Html.text "Automatically stopped"

        Running seed canvas particles ->
            Svg.svg
                [ SA.width (toString canvas.width)
                , SA.height (toString canvas.height)
                , SA.viewBox (String.join " " [ "0", "0", toString canvas.width, toString canvas.height ])
                ]
                (List.map viewParticle particles)


viewParticle : Particle -> Svg Msg
viewParticle { cx, cy, radius, color } =
    Svg.circle
        [ SA.fill (colorToHex color)
        , SA.cx (toString cx)
        , SA.cy (toString cy)
        , SA.r (toString radius)
        ]
        []



-- UPDATE ############################################################


type Msg
    = Tick Time
    | Stop


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case ( msg, model ) of
        ( Stop, _ ) ->
            ( Stopped, Cmd.none )

        ( Tick duration, Running seed canvas particles ) ->
            let
                ( newParticles, newSeed ) =
                    updateAllParticles (updateParticle False canvas) seed particles
            in
                ( Running newSeed canvas newParticles, Cmd.none )

        _ ->
            ( model, Cmd.none )


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


updateParticle : Bool -> Canvas -> Seed -> Particle -> ( Particle, Seed )
updateParticle forceReset canvas seed particle =
    if forceReset || particle.radius < 1 then
        Random.step particleVariablesGenerator seed
            |> Tuple.mapFirst (resetParticle particle)
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
              }
            , seed
            )


resetParticle : Particle -> ParticleVariables -> Particle
resetParticle particle ( maxRadius, color, angle ) =
    updateVelocity angle
        { particle
            | maxRadius = maxRadius
            , color = color
            , radius = 1
            , dying = False
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
    Decode.map pointFromList (Decode.list Decode.int)


pointFromList : List Int -> Point
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
    Random.float 2 5


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



-- TRIANGLE ########################################################
-- PARTICLE ########################################################


updateSpeed : Particle -> Particle
updateSpeed particle =
    let
        heading =
            atan2 particle.vx particle.vy

        _ =
            Debug.log "speed" particle.speed
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
